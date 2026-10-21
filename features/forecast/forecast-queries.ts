import "server-only";
import { geocode, toUnix } from "@/features/weather/weather-queries";
import {
  defaultUnits,
  describeWeatherCode,
} from "@/features/weather/weather-schema";
import type { WeatherUnits } from "@/features/weather/weather-schema";
import type { ForecastData } from "@/features/forecast/forecast-schema";

const HOURS_SHOWN = 24;
const DAYS_SHOWN = 10;
const HOUR = 3_600_000;
/**
Midnight of a day Open-Meteo names by its date, e.g. "2026-10-20".
*/
const MIDNIGHT = "T00:00";

interface Forecast {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
    precipitation_probability: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
}

async function fetchForecast(
  latitude: number,
  longitude: number,
  units: WeatherUnits
): Promise<Forecast> {
  const parameters = new URLSearchParams({
    current: "temperature_2m,weather_code,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: String(DAYS_SHOWN),
    hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
    latitude: String(latitude),
    longitude: String(longitude),
    temperature_unit: units === "f" ? "fahrenheit" : "celsius",
    timezone: "auto",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${parameters}`
  );
  if (!response.ok) {
    throw new Error(`The weather service returned ${response.status}.`);
  }
  return (await response.json()) as Forecast;
}

/**
The next 24 hours and the next ten days for a place. Units follow the place unless given.
*/
export async function getForecast(
  location: string,
  units?: WeatherUnits
): Promise<ForecastData> {
  const place = await geocode(location);
  const unit = units ?? defaultUnits(place.country_code);
  const forecast = await fetchForecast(place.latitude, place.longitude, unit);
  const offset = forecast.utc_offset_seconds;
  const { current, hourly, daily } = forecast;

  const asOf = toUnix(current.time, offset);
  const isDay = current.is_day === 1;
  const now = describeWeatherCode(current.weather_code, isDay);

  // The hour that holds the reading, so the first one shown is "Now".
  const start = Math.max(
    hourly.time.findIndex((time) => toUnix(time, offset) + HOUR > asOf),
    0
  );
  const hours = hourly.time
    .slice(start, start + HOURS_SHOWN)
    .map((time, step) => {
      const index = start + step;
      const isHourDay = hourly.is_day[index] === 1;
      return {
        condition: describeWeatherCode(hourly.weather_code[index], isHourDay)
          .condition,
        isDay: isHourDay,
        precipitation: hourly.precipitation_probability[index] ?? 0,
        temperature: hourly.temperature_2m[index],
        time: toUnix(time, offset),
      };
    });

  const days = daily.time.slice(0, DAYS_SHOWN).map((date, index) => ({
    condition: describeWeatherCode(daily.weather_code[index], true).condition,
    high: daily.temperature_2m_max[index],
    low: daily.temperature_2m_min[index],
    precipitation: daily.precipitation_probability_max[index] ?? 0,
    time: toUnix(`${date}${MIDNIGHT}`, offset),
  }));

  return {
    asOf,
    current: {
      condition: now.condition,
      isDay,
      label: now.label,
      temperature: current.temperature_2m,
    },
    days,
    hours,
    location: place.name,
    region: [place.admin1, place.country].filter(Boolean).join(", "),
    timeZone: forecast.timezone,
    units: unit,
  };
}

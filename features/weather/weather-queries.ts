import "server-only";
import {
  defaultUnits,
  describeWeatherCode,
} from "@/features/weather/weather-schema";
import type {
  WeatherData,
  WeatherUnits,
} from "@/features/weather/weather-schema";

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

interface Forecast {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export class LocationNotFoundError extends Error {
  constructor(location: string, options?: ErrorOptions) {
    super(`Couldn't find a place called "${location}".`, options);
    this.name = "LocationNotFoundError";
  }
}

/**
The place a name means, narrowed by the region or country after a comma ("Paris, Texas").
*/
export async function geocode(location: string): Promise<GeocodeResult> {
  const [name, ...rest] = location.split(",").map((part) => part.trim());
  const qualifier = rest.join(" ").toLowerCase();
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`The geocoding service returned ${response.status}.`);
  }
  const { results } = (await response.json()) as {
    results?: GeocodeResult[];
  };
  if (!results?.length) {
    throw new LocationNotFoundError(location);
  }
  const narrowed = qualifier
    ? results.find((result) =>
        [result.admin1, result.country, result.country_code].some(
          (field) => field && qualifier.includes(field.toLowerCase())
        )
      )
    : undefined;
  return narrowed ?? results[0];
}

/**
Open-Meteo's local times ("2026-10-14T15:00") as Unix milliseconds.
*/
export function toUnix(localTime: string, offsetSeconds: number) {
  return Date.parse(`${localTime}Z`) - offsetSeconds * 1000;
}

/**
The live weather for a place. Units follow the place unless given.
*/
export async function getWeather(
  location: string,
  units?: WeatherUnits
): Promise<WeatherData> {
  const place = await geocode(location);
  const unit = units ?? defaultUnits(place.country_code);
  const parameters = new URLSearchParams({
    current: "temperature_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    forecast_days: "1",
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    temperature_unit: unit === "f" ? "fahrenheit" : "celsius",
    timezone: "auto",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${parameters}`
  );
  if (!response.ok) {
    throw new Error(`The weather service returned ${response.status}.`);
  }
  const forecast = (await response.json()) as Forecast;
  const offset = forecast.utc_offset_seconds;
  const { current, daily } = forecast;

  const asOf = toUnix(current.time, offset);
  const isDay = current.is_day === 1;
  const now = describeWeatherCode(current.weather_code, isDay);

  return {
    asOf,
    condition: now.condition,
    fake: false,
    high: daily.temperature_2m_max[0],
    isDay,
    label: now.label,
    location: place.name,
    low: daily.temperature_2m_min[0],
    region: [place.admin1, place.country].filter(Boolean).join(", "),
    sunrise: toUnix(daily.sunrise[0], offset),
    sunset: toUnix(daily.sunset[0], offset),
    temperature: current.temperature_2m,
    timeZone: forecast.timezone,
    units: unit,
  };
}

import { formatTemperature } from "@/features/weather/weather-schema";
import type {
  WeatherCondition,
  WeatherUnits,
} from "@/features/weather/weather-schema";

/**
The two ways the card reads the days ahead: the next 24 hours, or the next ten days.
*/
export const FORECAST_VIEWS = ["hourly", "daily"] as const;
export type ForecastView = (typeof FORECAST_VIEWS)[number];

export const FORECAST_VIEW_LABEL: Record<ForecastView, string> = {
  daily: "10-day",
  hourly: "Hourly",
};

export function isForecastView(value: unknown): value is ForecastView {
  return (FORECAST_VIEWS as readonly unknown[]).includes(value);
}

export interface ForecastHour {
  /**
  Unix time in milliseconds the hour starts at.
  */
  time: number;
  temperature: number;
  condition: WeatherCondition;
  isDay: boolean;
  /**
  Chance of rain or snow in the hour, 0 to 100.
  */
  precipitation: number;
}

export interface ForecastDay {
  /**
  Unix time in milliseconds of the day's local midnight.
  */
  time: number;
  high: number;
  low: number;
  condition: WeatherCondition;
  /**
  Highest chance of rain or snow in the day, 0 to 100.
  */
  precipitation: number;
}

export interface ForecastData {
  /**
  The place's name, e.g. "Austin".
  */
  location: string;
  /**
  The state or region and country, e.g. "Texas, United States".
  */
  region: string;
  /**
  IANA time zone of the place. Hours and days read in it.
  */
  timeZone: string;
  units: WeatherUnits;
  /**
  The weather right now, for the header.
  */
  current: {
    temperature: number;
    condition: WeatherCondition;
    label: string;
    isDay: boolean;
  };
  /**
  Every hour of the next 24, starting with the current one.
  */
  hours: ForecastHour[];
  /**
  The next ten days, starting with today.
  */
  days: ForecastDay[];
  /**
  Unix time in milliseconds of the reading.
  */
  asOf: number;
}

/**
The hours the hourly view shows: every second hour of the next 24, so twelve fit in two rows.
*/
export const HOUR_STEP = 2;

/**
The first one is "Now", so it takes the current reading, the same one the header shows, over the forecast for the whole hour.
*/
export function shownHours(data: ForecastData): ForecastHour[] {
  return data.hours
    .filter((_, index) => index % HOUR_STEP === 0)
    .map((hour, index) =>
      index === 0
        ? {
            ...hour,
            condition: data.current.condition,
            isDay: data.current.isDay,
            temperature: data.current.temperature,
          }
        : hour
    );
}

/**
"Now" for the current hour, then "3 PM", in the place's own time zone.
*/
export function formatForecastHour(
  hour: ForecastHour,
  index: number,
  timeZone: string
): string {
  if (index === 0) {
    return "Now";
  }
  const format = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    timeZone,
  });
  return format.format(hour.time);
}

/**
"Today" for the first day, then "Wed", in the place's own time zone.
*/
export function formatForecastDay(
  day: ForecastDay,
  index: number,
  timeZone: string
): string {
  if (index === 0) {
    return "Today";
  }
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  return format.format(day.time);
}

/**
A chance of rain or snow worth showing: lower chances read as noise.
*/
export const RAIN_SHOWN_FROM = 20;

/**
A chance of rain or snow the summary calls likely.
*/
const RAIN_LIKELY_FROM = 50;

function extremes(values: readonly number[]) {
  return { max: Math.max(...values), min: Math.min(...values) };
}

/**
One sentence the model (or a screen reader) can use to describe the card in a view.
*/
export function summarizeForecast(
  data: ForecastData,
  view: ForecastView
): string {
  const unit = data.units === "f" ? "F" : "C";
  if (view === "hourly") {
    const { max, min } = extremes(data.hours.map((hour) => hour.temperature));
    let [wettest] = data.hours;
    for (const hour of data.hours) {
      if (hour.precipitation > wettest.precipitation) {
        wettest = hour;
      }
    }
    const rain =
      wettest && wettest.precipitation >= RAIN_SHOWN_FROM
        ? ` The best chance of rain is ${wettest.precipitation}% around ${formatForecastHour(wettest, 1, data.timeZone)}.`
        : " Rain is unlikely.";
    return `${data.location} over the next 24 hours: ${formatTemperature(data.current.temperature)}${unit} now, between ${formatTemperature(min)} and ${formatTemperature(max)}.${rain}`;
  }
  const highs = extremes(data.days.map((day) => day.high));
  const lows = extremes(data.days.map((day) => day.low));
  const wetDays = data.days
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day.precipitation >= RAIN_LIKELY_FROM)
    .map(({ day, index }) => formatForecastDay(day, index, data.timeZone));
  const rain =
    wetDays.length > 0
      ? ` Rain or snow is likely on ${wetDays.join(", ")}.`
      : " Rain or snow is unlikely.";
  return `${data.location} over the next ${data.days.length} days: highs from ${formatTemperature(highs.min)} to ${formatTemperature(highs.max)}${unit}, lows from ${formatTemperature(lows.min)} to ${formatTemperature(lows.max)}.${rain}`;
}

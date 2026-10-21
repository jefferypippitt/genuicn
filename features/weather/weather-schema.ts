export const WEATHER_UNITS = ["f", "c"] as const;
export type WeatherUnits = (typeof WEATHER_UNITS)[number];

/**
What the sky is doing, at the detail the card draws it.
*/
export const WEATHER_CONDITIONS = [
  "clear",
  "partly-cloudy",
  "cloudy",
  "fog",
  "drizzle",
  "rain",
  "snow",
  "thunderstorm",
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

/**
Where the sun is: the light the sky is painted in.
*/
export const SKY_PHASES = [
  "night",
  "dawn",
  "sunrise",
  "day",
  "golden-hour",
  "sunset",
  "dusk",
] as const;
export type SkyPhase = (typeof SKY_PHASES)[number];

export const SKY_PHASE_LABEL: Record<SkyPhase, string> = {
  dawn: "Dawn",
  day: "Day",
  dusk: "Dusk",
  "golden-hour": "Golden hour",
  night: "Night",
  sunrise: "Sunrise",
  sunset: "Sunset",
};

export interface WeatherData {
  /**
  The place's name, e.g. "New York".
  */
  location: string;
  /**
  The state or region and country, e.g. "New York, United States".
  */
  region: string;
  /**
  IANA time zone of the place, e.g. "America/New_York".
  */
  timeZone: string;
  units: WeatherUnits;
  temperature: number;
  condition: WeatherCondition;
  /**
  e.g. "Mostly Cloudy": finer than `condition`.
  */
  label: string;
  isDay: boolean;
  high: number;
  low: number;
  /**
  Unix times in milliseconds of today's sunrise and sunset there.
  */
  sunrise: number;
  sunset: number;
  /**
  Unix time in milliseconds of the reading.
  */
  asOf: number;
  /**
  True when this is generated data, not a live forecast.
  */
  fake: boolean;
}

/** The condition and label for a WMO weather code (what Open-Meteo returns).
 *  https://open-meteo.com/en/docs#weather_variable_documentation */
export function describeWeatherCode(
  code: number,
  isDay: boolean
): { condition: WeatherCondition; label: string } {
  if (code === 0) {
    return { condition: "clear", label: isDay ? "Sunny" : "Clear" };
  }
  if (code === 1) {
    return {
      condition: "clear",
      label: isDay ? "Mostly Sunny" : "Mostly Clear",
    };
  }
  if (code === 2) {
    return { condition: "partly-cloudy", label: "Partly Cloudy" };
  }
  if (code === 3) {
    return { condition: "cloudy", label: "Mostly Cloudy" };
  }
  if (code === 45 || code === 48) {
    return { condition: "fog", label: "Foggy" };
  }
  if (code >= 51 && code <= 57) {
    return { condition: "drizzle", label: "Drizzle" };
  }
  if (code === 66 || code === 67) {
    return { condition: "rain", label: "Freezing Rain" };
  }
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return {
      condition: "rain",
      label: code === 65 || code === 82 ? "Heavy Rain" : "Rain",
    };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { condition: "snow", label: "Snow" };
  }
  return code >= 95
    ? { condition: "thunderstorm", label: "Thunderstorms" }
    : { condition: "cloudy", label: "Cloudy" };
}

const MINUTE = 60_000;

/** The sky's phase at `time`, from that day's sunrise and sunset: a short
 *  dawn and sunrise around the first, golden hour, sunset and dusk around
 *  the second, plain day between them and night outside. */
export function skyPhase(
  time: number,
  sunrise: number,
  sunset: number
): SkyPhase {
  const fromSunrise = (time - sunrise) / MINUTE;
  const fromSunset = (time - sunset) / MINUTE;
  if (fromSunrise < -50 || fromSunset > 55) {
    return "night";
  }
  if (fromSunrise < -10) {
    return "dawn";
  }
  if (fromSunrise < 40) {
    return "sunrise";
  }
  if (fromSunset < -70) {
    return "day";
  }
  if (fromSunset < -20) {
    return "golden-hour";
  }
  return fromSunset < 15 ? "sunset" : "dusk";
}

/**
Fahrenheit where people expect it, Celsius everywhere else.
*/
export function defaultUnits(countryCode: string | undefined): WeatherUnits {
  return ["US", "LR", "MM", "BS", "BZ", "KY", "PW"].includes(
    countryCode?.toUpperCase() ?? ""
  )
    ? "f"
    : "c";
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

/** One sentence the model (or a screen reader) can use to describe the
 *  card. */
export function summarizeWeather(data: WeatherData): string {
  const unit = data.units === "f" ? "F" : "C";
  return `${data.location}: ${Math.round(data.temperature)}°${unit} and ${data.label.toLowerCase()}, with a high of ${Math.round(data.high)}° and a low of ${Math.round(data.low)}°.`;
}

import type {
  WeatherData,
  WeatherUnits,
} from "@/features/weather/weather-schema";

const sharedWeatherRequests = new Map<
  string,
  { expiresAt: number; weather: Promise<WeatherData> }
>();
const REUSE_MS = 600_000;

function weatherKey(location: string, units: WeatherUnits | "auto" = "auto") {
  return `${location.trim().toLowerCase()}:${units}`;
}

async function fetchWeather(location: string, units?: WeatherUnits) {
  const parameters = new URLSearchParams({ location });
  if (units) {
    parameters.set("units", units);
  }
  const response = await fetch(`/api/weather?${parameters}`);
  const body = (await response.json()) as WeatherData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Weather request failed: ${response.status}`
    );
  }
  return body;
}

async function requestWeather(
  key: string,
  location: string,
  units?: WeatherUnits
) {
  try {
    return await fetchWeather(location, units);
  } catch (error) {
    sharedWeatherRequests.delete(key);
    throw error;
  }
}

export function loadWeather(location: string, units?: WeatherUnits) {
  const key = weatherKey(location, units);
  const hit = sharedWeatherRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.weather;
  }
  const weather = requestWeather(key, location, units);
  sharedWeatherRequests.set(key, {
    expiresAt: Date.now() + REUSE_MS,
    weather,
  });
  return weather;
}

export function primeWeather(
  location: string,
  units: WeatherUnits | undefined,
  data: WeatherData
) {
  sharedWeatherRequests.set(weatherKey(location, units), {
    expiresAt: Infinity,
    weather: Promise.resolve(data),
  });
}

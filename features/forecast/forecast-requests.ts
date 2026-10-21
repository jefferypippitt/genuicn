import type { ForecastData } from "@/features/forecast/forecast-schema";
import type { WeatherUnits } from "@/features/weather/weather-schema";

/**
One request per place and units, shared by every card that asks within ten minutes, the same time the API route caches for. Both views come from one answer, so switching views never waits.
*/
const sharedForecastRequests = new Map<
  string,
  { expiresAt: number; forecast: Promise<ForecastData> }
>();
const REUSE_MS = 600_000;

function forecastKey(location: string, units: WeatherUnits | "auto" = "auto") {
  return `${location.trim().toLowerCase()}:${units}`;
}

async function fetchForecast(location: string, units?: WeatherUnits) {
  const parameters = new URLSearchParams({ location });
  if (units) {
    parameters.set("units", units);
  }
  const response = await fetch(`/api/forecast?${parameters}`);
  const body = (await response.json()) as ForecastData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Forecast request failed: ${response.status}`
    );
  }
  return body;
}

async function requestForecast(
  key: string,
  location: string,
  units?: WeatherUnits
) {
  try {
    return await fetchForecast(location, units);
  } catch (error) {
    sharedForecastRequests.delete(key);
    throw error;
  }
}

export function loadForecast(location: string, units?: WeatherUnits) {
  const key = forecastKey(location, units);
  const hit = sharedForecastRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.forecast;
  }
  const forecast = requestForecast(key, location, units);
  sharedForecastRequests.set(key, {
    expiresAt: Date.now() + REUSE_MS,
    forecast,
  });
  return forecast;
}

/**
Seeds the cache with saved data, so a replayed chat shows the forecast it recorded.
*/
export function primeForecast(
  location: string,
  units: WeatherUnits | undefined,
  data: ForecastData
) {
  sharedForecastRequests.set(forecastKey(location, units), {
    expiresAt: Infinity,
    forecast: Promise.resolve(data),
  });
}

import { getForecast } from "@/features/forecast/forecast-queries";
import { LocationNotFoundError } from "@/features/weather/weather-queries";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";
import type { WeatherUnits } from "@/features/weather/weather-schema";

const CACHE = "public, s-maxage=600, stale-while-revalidate=1800";
const MAX_LOCATION_LENGTH = 100;

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const UPSTREAM_FAILED = 502;

function isUnits(value: string): value is WeatherUnits {
  return (WEATHER_UNITS as readonly string[]).includes(value);
}

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const units = searchParams.get("units");

  if (
    !location ||
    location.length > MAX_LOCATION_LENGTH ||
    (units !== null && !isUnits(units))
  ) {
    return Response.json(
      { error: "Pass a location, and optionally units of f or c." },
      { status: BAD_REQUEST }
    );
  }

  const requested = units ?? undefined;
  try {
    return Response.json(await getForecast(location, requested), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status =
      error instanceof LocationNotFoundError ? NOT_FOUND : UPSTREAM_FAILED;
    return Response.json(
      { error: Error.isError(error) ? error.message : "Forecast failed." },
      { status }
    );
  }
}

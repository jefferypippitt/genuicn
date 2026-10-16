import {
  getWeather,
  LocationNotFoundError,
} from "@/features/weather/weather-queries";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";
import type { WeatherUnits } from "@/features/weather/weather-schema";

const CACHE = "public, s-maxage=600, stale-while-revalidate=1800";
const MAX_LOCATION_LENGTH = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const units = searchParams.get("units");

  if (
    !location ||
    location.length > MAX_LOCATION_LENGTH ||
    (units !== null && !(WEATHER_UNITS as readonly string[]).includes(units))
  ) {
    return Response.json(
      { error: "Pass a location, and optionally units of f or c." },
      { status: 400 }
    );
  }

  try {
    return Response.json(
      await getWeather(location, (units as WeatherUnits | null) ?? undefined),
      { headers: { "Cache-Control": CACHE } }
    );
  } catch (error) {
    const status = error instanceof LocationNotFoundError ? 404 : 502;
    return Response.json(
      { error: Error.isError(error) ? error.message : "Weather failed." },
      { status }
    );
  }
}

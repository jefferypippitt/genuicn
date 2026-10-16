import { getCheckIn } from "@/features/flights/flight-queries";
import { FlightNotFoundError } from "@/features/flights/flight-route";
import {
  errorMessage,
  isFlightDate,
  normalizeFlightNumber,
} from "@/features/flights/flight-schema";

const CACHE = "private, max-age=300";

function today() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flight = normalizeFlightNumber(searchParams.get("flight") ?? "");
  const date = searchParams.get("date") ?? today();

  if (!flight || !isFlightDate(date)) {
    return Response.json(
      {
        error:
          'Pass a flight number such as "BA 117", and optionally a date as YYYY-MM-DD.',
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getCheckIn(flight, date), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof FlightNotFoundError ? 404 : 502;
    return Response.json(
      { error: errorMessage(error, "Check-in lookup failed.") },
      { status }
    );
  }
}

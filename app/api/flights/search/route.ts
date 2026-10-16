import { findCity } from "@/features/flights/flight-network";
import { errorMessage, isFlightDate } from "@/features/flights/flight-schema";
import { searchFlights } from "@/features/flights/flight-search";

const CACHE = "private, max-age=300";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = findCity(searchParams.get("from") ?? "");
  const to = findCity(searchParams.get("to") ?? "");
  const date = searchParams.get("date") ?? "";

  if (!(from && to && isFlightDate(date))) {
    return Response.json(
      {
        error:
          'Pass from and to as cities or airport codes the demo flies to, such as "London" and "JFK", and a date as YYYY-MM-DD.',
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await searchFlights(from, to, date), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Flight search failed.") },
      { status: 502 }
    );
  }
}

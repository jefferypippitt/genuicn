import "server-only";
import type { FlightPlace } from "@/features/flights/flight-schema";

interface AdsbdbAirport {
  iata_code: string;
  municipality: string;
  name: string;
}

interface AdsbdbRoute {
  response:
    | string
    | {
        flightroute: {
          airline: { name: string; iata: string | null } | null;
          origin: AdsbdbAirport;
          destination: AdsbdbAirport;
        };
      };
}

/**
How long to wait for adsbdb before the route answers with an error instead of hanging.
*/
const ROUTE_TIMEOUT_MS = 8000;

export class FlightNotFoundError extends Error {
  constructor(flight: string, options?: ErrorOptions) {
    super(`Couldn't find flight ${flight}.`, options);
    this.name = "FlightNotFoundError";
  }
}

function placeOf(airport: AdsbdbAirport): FlightPlace {
  return {
    airport: airport.name,
    city: airport.municipality,
    code: airport.iata_code,
  };
}

export async function getRoute(flight: string) {
  const callsign = flight.replaceAll(" ", "");
  const response = await fetch(
    `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`,
    { signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) }
  );
  if (response.status === 404 || response.status === 400) {
    throw new FlightNotFoundError(flight);
  }
  if (!response.ok) {
    throw new Error(`The flight route service returned ${response.status}.`);
  }
  const body = (await response.json()) as AdsbdbRoute;
  if (typeof body.response === "string") {
    throw new FlightNotFoundError(flight);
  }
  const { airline, origin, destination } = body.response.flightroute;
  const [flightPrefix] = flight.split(" ", 1);
  return {
    airline: airline?.name ?? flightPrefix,
    airlineCode: airline?.iata ?? flightPrefix,
    from: placeOf(origin),
    to: placeOf(destination),
  };
}

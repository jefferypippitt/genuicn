import {
  localToday,
  normalizeFlightNumber,
} from "@/features/flights/flight-schema";
import type {
  BoardingPassData,
  CheckInData,
  FlightOffer,
} from "@/features/flights/flight-schema";

interface SharedRequest<T> {
  expiresAt: number;
  data: Promise<T>;
}

const sharedPassRequests = new Map<string, SharedRequest<BoardingPassData>>();
const sharedCheckInRequests = new Map<string, SharedRequest<CheckInData>>();
const REUSE_MS = 300_000;

/**
The date to ask for: the one given, or today in the traveler's own time zone (the server would use UTC, a day off near midnight).
*/
function dayOf(date?: string | null) {
  return typeof date === "string" && date ? date : localToday();
}

function flightKey(flight: string, date?: string | null) {
  const number = normalizeFlightNumber(flight) ?? flight.trim().toUpperCase();
  return `${number}:${dayOf(date)}`;
}

async function fetchFlightJson<T>(
  path: string,
  flight: string,
  date?: string | null
) {
  const parameters = new URLSearchParams({ date: dayOf(date), flight });
  const response = await fetch(`${path}?${parameters}`);
  const body = (await response.json()) as T | { error: string };
  if (!response.ok || (typeof body === "object" && body && "error" in body)) {
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? body.error
        : `Flight request failed: ${response.status}`
    );
  }
  return body as T;
}

async function requestShared<T>(
  requests: Map<string, SharedRequest<T>>,
  key: string,
  request: () => Promise<T>
) {
  try {
    return await request();
  } catch (error) {
    requests.delete(key);
    throw error;
  }
}

/**
One request per flight and date, shared by every card that asks within REUSE_MS; a failed one is dropped so the next card retries.
*/
function loadShared<T>(
  requests: Map<string, SharedRequest<T>>,
  path: string,
  flight: string,
  date?: string | null
) {
  const key = flightKey(flight, date);
  const hit = requests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.data;
  }
  const data = requestShared(requests, key, () =>
    fetchFlightJson<T>(path, flight, date)
  );
  requests.set(key, { data, expiresAt: Date.now() + REUSE_MS });
  return data;
}

export function loadBoardingPass(flight: string, date?: string | null) {
  return loadShared(sharedPassRequests, "/api/flights", flight, date);
}

export function primeBoardingPass(
  flight: string,
  date: string | null,
  data: BoardingPassData
) {
  sharedPassRequests.set(flightKey(flight, date), {
    data: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

export function loadCheckIn(flight: string, date?: string | null) {
  return loadShared(
    sharedCheckInRequests,
    "/api/flights/check-in",
    flight,
    date
  );
}

/**
The flights from one city to another on a date (cities by name or airport code).
*/
export async function searchFlights(from: string, to: string, date: string) {
  const parameters = new URLSearchParams({ date, from, to });
  const response = await fetch(`/api/flights/search?${parameters}`);
  const body = (await response.json()) as FlightOffer[] | { error: string };
  if (!Array.isArray(body)) {
    throw new TypeError(body.error);
  }
  return body;
}

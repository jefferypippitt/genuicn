export interface FlightPlace {
  /**
  e.g. "London".
  */
  city: string;
  /**
  The airport's IATA code, e.g. "LHR".
  */
  code: string;
  /**
  e.g. "London Heathrow Airport".
  */
  airport: string;
}

export interface BoardingPassData {
  /**
  e.g. "BA 117".
  */
  flight: string;
  airline: string;
  /**
  The airline's IATA code, e.g. "BA". Picks the logo.
  */
  airlineCode: string;
  /**
  The departure date, as YYYY-MM-DD.
  */
  date: string;
  from: FlightPlace;
  to: FlightPlace;
  passenger: string;
  seat: string;
  /**
  The cabin the seat is in, e.g. "Business".
  */
  cabin: string;
  gate: string;
  /**
  Local time at the departure airport, e.g. "07:00".
  */
  boardingTime: string;
  /**
  Local time the flight leaves, e.g. "07:40". Missing on passes saved before it existed.
  */
  departureTime?: string;
  /**
  The booking reference, e.g. "K7QD2M", when the pass came from a booking lookup.
  */
  reference?: string;
  /**
  The departure terminal, e.g. "5". Missing on passes saved before it existed.
  */
  terminal?: string;
  /**
  The boarding group, e.g. "3". Missing on passes saved before it existed.
  */
  group?: string;
  /**
  Extras on the booking, shown as tags, e.g. ["Fast Track", "Lounge access"].
  */
  perks?: string[];
  /**
  True when the booking details (passenger, seat, cabin, gate, boarding time) are generated, not from a booking system.
  */
  demo: boolean;
}

/**
One flight a search found: the real route and airline, with the demo booking's times, cabin and fare.
*/
export interface FlightOffer {
  /**
  e.g. "BA 117".
  */
  flight: string;
  airline: string;
  airlineCode: string;
  from: FlightPlace;
  to: FlightPlace;
  /**
  The departure date, as YYYY-MM-DD.
  */
  date: string;
  /**
  Local time at the departure airport, e.g. "08:20".
  */
  departureTime: string;
  /**
  Local time at the arrival airport, e.g. "11:20".
  */
  arrivalTime: string;
  /**
  Days after the departure date that it lands: 0 the same day, 1 the next.
  */
  arrivalDays: number;
  minutes: number;
  cabin: string;
  /**
  The fare in US dollars.
  */
  price: number;
}

export type SeatPosition = "window" | "aisle" | "middle";

/**
Where each seat letter sits in a 3-3-3 row: ABC, DEF, HJK.
*/
export const SEAT_POSITIONS: Record<string, SeatPosition> = {
  A: "window",
  B: "middle",
  C: "aisle",
  D: "aisle",
  E: "middle",
  F: "aisle",
  H: "aisle",
  J: "middle",
  K: "window",
};

/**
"14A" sits at the window. Null for a letter outside the 3-3-3 layout.
*/
export function seatPositionOf(seat: string): SeatPosition | null {
  return SEAT_POSITIONS[seat.slice(-1).toUpperCase()] ?? null;
}

export interface SeatOption {
  /**
  e.g. "14A".
  */
  seat: string;
  position: SeatPosition;
  /**
  True for the seat the booking has now.
  */
  current: boolean;
  /**
  A seat with extra legroom (on the cabin's first row).
  */
  legroom: boolean;
  /**
  What switching to it costs, in US dollars: 0 for the seat the booking has now.
  */
  price: number;
}

export interface SeatMapSeat {
  /**
  e.g. "14A".
  */
  seat: string;
  /**
  Someone else has it.
  */
  taken: boolean;
}

export interface SeatMapRow {
  row: number;
  /**
  The cabin's first row, with extra legroom.
  */
  legroom: boolean;
  /**
  In letter order, the same letters as the map's blocks.
  */
  seats: SeatMapSeat[];
}

/**
A stretch of the booked cabin, front to back, for picking a seat.
*/
export interface SeatMap {
  /**
  The seat letters by block, with an aisle between blocks: [["A","B","C"],["D","E","F"],["H","J","K"]].
  */
  blocks: string[][];
  rows: SeatMapRow[];
  /**
  The seat the booking has now.
  */
  current: string;
  /**
  What a seat costs in US dollars, standard or on the legroom row. The current seat is free.
  */
  prices: { standard: number; legroom: number };
}

/**
What check-in needs: the pass as it stands, and the map of the booked cabin to pick a seat from.
*/
export interface CheckInData {
  pass: BoardingPassData;
  seatMap: SeatMap;
}

/**
The seat as an option: where it sits, whether it's the booked one, and what it costs. Null when the seat isn't on the map.
*/
export function seatOptionOf(map: SeatMap, seat: string): SeatOption | null {
  const row = map.rows.find((entry) =>
    entry.seats.some((candidate) => candidate.seat === seat)
  );
  const position = seatPositionOf(seat);
  if (!(row && position)) {
    return null;
  }
  const isCurrent = seat === map.current;
  let price = row.legroom ? map.prices.legroom : map.prices.standard;
  if (isCurrent) {
    price = 0;
  }
  return { current: isCurrent, legroom: row.legroom, position, price, seat };
}

const AIRLINE_CODE = /^[A-Z\d]{2,3}$/u;
const FLIGHT_DIGITS = /^\d{1,4}[A-Z]?$/u;
const LETTER = /^[A-Z]$/u;
const WHITESPACE = /\s/gu;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/**
"ba117" and "BA 117" both read "BA 117". Null when it isn't a flight number.
*/
export function normalizeFlightNumber(flight: string): string | null {
  const compact = flight.replaceAll(WHITESPACE, "").toUpperCase();
  const codeLength = LETTER.test(compact.charAt(2)) ? 3 : 2;
  const airline = compact.slice(0, codeLength);
  const number = compact.slice(codeLength);
  const isFlight = AIRLINE_CODE.test(airline) && FLIGHT_DIGITS.test(number);
  return isFlight ? `${airline} ${number}` : null;
}

export function isFlightDate(date: string) {
  if (!ISO_DATE.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
  );
}

/**
"2026-11-03" reads "03 NOV 2026".
*/
export function formatFlightDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date.toUpperCase();
  }
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/**
The message of a thrown error, or the fallback when something else was thrown. Uses instanceof rather than Error.isError, which Node 22 and older browsers don't have.
*/
export function errorMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError is missing on Node 22 and older browsers
  return error instanceof Error ? error.message : fallback;
}

/**
Today's date where the code runs, as YYYY-MM-DD: the traveler's day in the browser, not UTC.
*/
export function localToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
The airline's logo: a square tile from the Aviasales logo CDN (pics.avs.io), by IATA code, no API key. A code without a logo answers 404, and the card falls back to a letter tile. To serve logos from your own host, change this URL; if your app sets a Content-Security-Policy, allow its host in img-src.
*/
export function airlineLogoUrl(airlineCode: string): string {
  return `https://pics.avs.io/al_square/96/96/${encodeURIComponent(airlineCode.toUpperCase())}.png`;
}

export function summarizeBoardingPass(data: BoardingPassData): string {
  const where = [
    `Seat ${data.seat} in ${data.cabin}`,
    data.terminal ? `terminal ${data.terminal}` : null,
    `gate ${data.gate}`,
    data.group ? `group ${data.group}` : null,
    `boarding ${data.boardingTime}`,
  ].filter(Boolean);
  const perks = data.perks?.length ? ` With ${data.perks.join(", ")}.` : "";
  return `Boarding pass for ${data.passenger}, ${data.airline} flight ${data.flight} from ${data.from.city} (${data.from.code}) to ${data.to.city} (${data.to.code}) on ${formatFlightDate(data.date)}. ${where.join(", ")}.${perks}`;
}

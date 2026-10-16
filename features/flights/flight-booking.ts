import "server-only";
import type { SeatMap } from "@/features/flights/flight-schema";

export interface Booking {
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
  Local time the flight leaves, e.g. "07:40".
  */
  departureTime: string;
  /**
  The departure terminal, e.g. "5".
  */
  terminal: string;
  /**
  The boarding group, e.g. "3": earlier for the front cabins.
  */
  group: string;
  /**
  True when this is generated, not read from a booking system.
  */
  demo: boolean;
}

const DEMO_TRAVELERS = { female: "Jan Doe", male: "Jon Doe" } as const;
const CABINS = [
  { cabin: "First", lastRow: 2 },
  { cabin: "Business", lastRow: 9 },
  { cabin: "Premium", lastRow: 14 },
] as const;
const ECONOMY = "Economy";
const FEMALE_SHARE = 0.5;
const SEAT_LETTERS = "ABCDEFHJK";
/**
The boarding group each cabin starts at; economy spreads over the groups after it.
*/
const CABIN_GROUPS: Record<string, number> = {
  Business: 2,
  Economy: 4,
  First: 1,
  Premium: 3,
};
const ECONOMY_GROUPS = 3;
const TERMINALS = 5;
const STANDARD_SEAT_PRICE = 14;
const LEGROOM_SEAT_PRICE = 28;
/**
The seat letters in each block of a 3-3-3 row, aisles between the blocks.
*/
const SEAT_BLOCKS = [
  ["A", "B", "C"],
  ["D", "E", "F"],
  ["H", "J", "K"],
] as const;
const MAP_ROWS = 10;
/**
How many rows the map shows ahead of the booked seat's row.
*/
const MAP_ROWS_BEFORE = 3;
const TAKEN_SHARE = 0.35;
const GATE_LETTERS = "ABCDE";
const ROWS = 48;
const GATES = 40;
const FIRST_BOARDING_MINUTE = 6 * 60;
const BOARDING_WINDOW_MINUTES = 16 * 60;
const MINUTE_STEP = 5;
/**
Boarding starts this long before the flight leaves.
*/
const BOARDING_LEAD_MINUTES = 40;
const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;
const HASH_BASE = 31;

function seeded(seed: string) {
  let state = 1;
  for (const char of seed) {
    state = (state * HASH_BASE + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return state / MODULUS;
  };
}

function pick(random: () => number, items: string) {
  return items[Math.floor(random() * items.length)];
}

function cabinOf(row: number) {
  return CABINS.find(({ lastRow }) => row <= lastRow)?.cabin ?? ECONOMY;
}

function firstRowOf(cabin: string) {
  const index = CABINS.findIndex((entry) => entry.cabin === cabin);
  const before = index === -1 ? CABINS.at(-1) : CABINS[index - 1];
  return (before?.lastRow ?? 0) + 1;
}

function lastRowOf(cabin: string) {
  return CABINS.find((entry) => entry.cabin === cabin)?.lastRow ?? ROWS;
}

function clockTime(minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
The signed-in traveler's booking on this flight. This version makes up a stable demo booking per flight and date; replace it with a call to your booking system, and throw when the traveler has no booking on the flight.
*/
export function getBooking(flight: string, date: string): Promise<Booking> {
  const random = seeded(`${flight}:${date}`);
  const steps = Math.floor((random() * BOARDING_WINDOW_MINUTES) / MINUTE_STEP);
  const boardingMinute = FIRST_BOARDING_MINUTE + steps * MINUTE_STEP;
  const boardingTime = clockTime(boardingMinute);
  const gate = `${pick(random, GATE_LETTERS)}${1 + Math.floor(random() * GATES)}`;
  const row = 1 + Math.floor(random() * ROWS);
  const seat = `${row}${pick(random, SEAT_LETTERS)}`;
  const traveler = random() < FEMALE_SHARE ? "female" : "male";
  const cabin = cabinOf(row);
  // Drawn after the fields above, so those stay as they were.
  const terminal = String(1 + Math.floor(random() * TERMINALS));
  const spread = cabin === ECONOMY ? Math.floor(random() * ECONOMY_GROUPS) : 0;
  return Promise.resolve({
    boardingTime,
    cabin,
    demo: true,
    departureTime: clockTime(boardingMinute + BOARDING_LEAD_MINUTES),
    gate,
    group: String(CABIN_GROUPS[cabin] + spread),
    passenger: DEMO_TRAVELERS[traveler],
    seat,
    terminal,
  });
}

/**
A stretch of the booked cabin around the booked seat, up to MAP_ROWS rows, laid out 3-3-3 with about a third of the seats taken by others (never the booked one). The cabin's first row has extra legroom. Prices are in US dollars. This version makes up a stable demo map; replace it with your booking system's seat map.
*/
export function getSeatMap(
  flight: string,
  date: string,
  booking: Pick<Booking, "seat" | "cabin">
): Promise<SeatMap> {
  const random = seeded(`${flight}:${date}:seats`);
  const firstRow = firstRowOf(booking.cabin);
  const lastRow = lastRowOf(booking.cabin);
  const bookedRow = Number(booking.seat.slice(0, -1));
  const start = Math.min(
    Math.max(firstRow, bookedRow - MAP_ROWS_BEFORE),
    Math.max(firstRow, lastRow - MAP_ROWS + 1)
  );
  const end = Math.min(lastRow, start + MAP_ROWS - 1);
  const letters = SEAT_BLOCKS.flat();
  const rows = Array.from({ length: end - start + 1 }, (_, index) => {
    const row = start + index;
    return {
      legroom: row === firstRow,
      row,
      seats: letters.map((letter) => {
        const seat = `${row}${letter}`;
        return { seat, taken: seat !== booking.seat && random() < TAKEN_SHARE };
      }),
    };
  });
  return Promise.resolve({
    blocks: SEAT_BLOCKS.map((block) => [...block]),
    current: booking.seat,
    prices: { legroom: LEGROOM_SEAT_PRICE, standard: STANDARD_SEAT_PRICE },
    rows,
  });
}

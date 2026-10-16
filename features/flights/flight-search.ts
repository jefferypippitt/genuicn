import "server-only";
import { getBooking } from "@/features/flights/flight-booking";
import { flightsBetween, zoneOf } from "@/features/flights/flight-network";
import { getRoute } from "@/features/flights/flight-route";
import type { NetworkCity } from "@/features/flights/flight-network";
import type { FlightOffer } from "@/features/flights/flight-schema";

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;
const HASH_BASE = 31;
const MODULUS = 2_147_483_647;
/**
The share of days each flight operates, so some days on thin routes have none.
*/
const OPERATING_SHARE = 0.85;
const BASE_FARE = 120;
const FARE_PER_MINUTE = 0.55;
const FARE_SPREAD = 0.3;
const CABIN_FARES: Record<string, number> = {
  Business: 4,
  Economy: 1,
  First: 7,
  Premium: 1.8,
};

/**
A stable number from 0 to 1 for a flight on a date.
*/
function chance(seed: string) {
  let state = 1;
  for (const char of seed) {
    state = (state * HASH_BASE + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return state / MODULUS;
}

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;

/**
How far a time zone is ahead of UTC at an instant, in minutes.
*/
function offsetOf(zone: string, instant: number) {
  const format = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    minute: "numeric",
    month: "numeric",
    timeZone: zone,
    year: "numeric",
  });
  const parts = format.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  const local = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute")
  );
  return (local - instant) / MS_PER_MINUTE;
}

/**
The local arrival: leave at a local time in one zone, fly for some minutes, land in another zone. Returns the clock time there and how many days after the departure date that is.
*/
function arrivalOf(
  date: string,
  departure: string,
  minutes: number,
  fromZone: string,
  toZone: string
) {
  const dayStart = Date.parse(`${date}T00:00:00Z`);
  const asUtc = dayStart + minutesOf(departure) * MS_PER_MINUTE;
  const leaves = asUtc - offsetOf(fromZone, asUtc) * MS_PER_MINUTE;
  const lands = leaves + minutes * MS_PER_MINUTE;
  const landsLocal = lands + offsetOf(toZone, lands) * MS_PER_MINUTE;
  const landing = new Date(landsLocal);
  const clock = landing.toISOString().slice(11, 16);
  return {
    days: Math.floor((landsLocal - dayStart) / MS_PER_DAY),
    time: clock,
  };
}

/**
The flights from one city to another on a date, earliest first. Routes and airlines are real (adsbdb); the departure time, cabin and fare come from the demo booking, and the arrival is the flight time later in the destination's time zone. Replace this with a flight search API for real schedules and fares.
*/
export async function searchFlights(
  from: NetworkCity,
  to: NetworkCity,
  date: string
): Promise<FlightOffer[]> {
  const operating = flightsBetween(from, to).filter(
    (entry) => chance(`${entry.flight}:${date}:operates`) < OPERATING_SHARE
  );
  const offers = await Promise.all(
    operating.map(async (entry) => {
      const [route, booking] = await Promise.all([
        getRoute(entry.flight),
        getBooking(entry.flight, date),
      ]);
      const arrival = arrivalOf(
        date,
        booking.departureTime,
        entry.minutes,
        zoneOf(entry.from),
        zoneOf(entry.to)
      );
      const spread =
        1 + (chance(`${entry.flight}:${date}:fare`) - 0.5) * FARE_SPREAD;
      const fare =
        (BASE_FARE + entry.minutes * FARE_PER_MINUTE) *
        (CABIN_FARES[booking.cabin] ?? 1) *
        spread;
      return {
        ...route,
        arrivalDays: arrival.days,
        arrivalTime: arrival.time,
        cabin: booking.cabin,
        date,
        departureTime: booking.departureTime,
        flight: entry.flight,
        minutes: entry.minutes,
        price: Math.round(fare),
      };
    })
  );
  return offers.toSorted((a, b) =>
    a.departureTime.localeCompare(b.departureTime)
  );
}

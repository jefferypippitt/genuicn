import "server-only";
import { getBooking, getSeatMap } from "@/features/flights/flight-booking";
import { getRoute } from "@/features/flights/flight-route";
import type {
  BoardingPassData,
  CheckInData,
} from "@/features/flights/flight-schema";

/**
The boarding pass for a flight on a date: the route from adsbdb, the booking from getBooking. Pass the flight normalized ("BA 117") and the date as YYYY-MM-DD.
*/
export async function getBoardingPass(
  flight: string,
  date: string
): Promise<BoardingPassData> {
  const [route, booking] = await Promise.all([
    getRoute(flight),
    getBooking(flight, date),
  ]);
  return { ...route, ...booking, date, flight };
}

/**
Check-in for a flight on a date: the boarding pass, and the map of the traveler's cabin to pick a seat from.
*/
export async function getCheckIn(
  flight: string,
  date: string
): Promise<CheckInData> {
  const pass = await getBoardingPass(flight, date);
  const seatMap = await getSeatMap(flight, date, pass);
  return { pass, seatMap };
}

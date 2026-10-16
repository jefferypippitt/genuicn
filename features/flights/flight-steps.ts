import { listOf } from "@/features/chat/lookup";
import { loadBoardingPass } from "@/features/flights/flight-requests";
import { normalizeFlightNumber } from "@/features/flights/flight-schema";
import type { CardLookup } from "@/features/chat/lookup";

function propertiesOf(properties: Record<string, unknown>) {
  return {
    date: typeof properties.date === "string" ? properties.date : null,
    flight: typeof properties.flight === "string" ? properties.flight : "",
  };
}

export const boardingPassLookup: CardLookup = {
  intent: (flights) =>
    flights.length === 1
      ? `The boarding pass for ${flights[0]}`
      : `Boarding passes for ${listOf(flights)}`,
  load: (properties) => {
    const { flight, date } = propertiesOf(properties);
    return loadBoardingPass(flight, date);
  },
  sources: () => [{ href: "https://www.adsbdb.com/", label: "adsbdb.com" }],
  subject: (properties) =>
    normalizeFlightNumber(propertiesOf(properties).flight),
};

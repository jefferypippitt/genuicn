import { z } from "zod";

export const boardingPassCatalogEntry = {
  description:
    "A boarding pass for one of the user's flights: passenger, flight, date, seat, the route, gate, boarding time and class. It fetches its own data from the booking. Use it whenever the user asks for their boarding pass, seat, gate or boarding time for a flight.",
  props: z.object({
    date: z
      .string()
      .nullable()
      .describe(
        'The departure date as YYYY-MM-DD, e.g. "2026-11-03", converted from however the user wrote it. Null for today.'
      ),
    flight: z
      .string()
      .describe(
        'The flight number with its airline code, e.g. "BA 117" or "UA 837".'
      ),
    variant: z
      .enum(["map", "brand"])
      .nullable()
      .describe(
        `How the ticket looks. "brand" paints the whole ticket in the airline's colors. "map" draws a world map on the theme's card color. Null for "map", unless the user asks for the airline's colors or branding.`
      ),
  }),
};

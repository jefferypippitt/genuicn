import { z } from "zod";
import { CONFERENCES } from "@/features/standings/standings-schema";

export const standingsCatalogEntry = {
  description:
    "The NBA standings for one conference this regular season: each team's place, wins, losses, win percentage, games behind, and its records against the conference, at home, away and over the last ten games, with its current streak. It fetches its own data. Use it whenever the user asks for the NBA standings, a conference's table, who leads the East or the West, or where a team stands. For both conferences, or the whole league, show two cards in a CardGroup, east first. For one team, show its conference.",
  props: z.object({
    conference: z
      .enum(CONFERENCES)
      .describe(
        'The conference: "east" for the Eastern Conference, "west" for the Western Conference.'
      ),
  }),
};

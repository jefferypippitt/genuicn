import { z } from "zod";

export const playerCatalogEntry = {
  description:
    "NBA players this season, one row each in one table: photo, number, name, height, age and seasons in the league, with points, assists, rebounds and steals per game, and the team each plays for now. It fetches its own data and finds each player's current team itself, so trades and signings are always up to date. Use it whenever the user asks about NBA players: their stats, averages, how they're doing, or what team they're on. Send each player's full name. For a comparison, or several players, put them all in this one card, in the order the user named them, rather than several cards.",
  props: z.object({
    players: z
      .array(z.string())
      .describe(
        'The NBA players\' full names, one or more, e.g. ["LeBron James"] or ["LeBron James", "Victor Wembanyama"].'
      ),
  }),
};

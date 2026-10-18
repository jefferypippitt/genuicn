import { z } from "zod";

export const scoreboardCatalogEntry = {
  description:
    "A live NBA scoreboard for one team's game: both teams, their records, the score, the clock or final, and a table of each quarter played so far. Before a game it shows the start time. It fetches its own data and keeps a live game's score current. Use it whenever the user asks for an NBA score, a quarter's score, how an NBA team's game is going, who won, or when an NBA team plays next. Send the team's full name. When the user names a day (\"last night\", \"on Sunday\", \"October 11\"), set date to that day as YYYY-MM-DD, worked out from today's date; otherwise date is null and the card shows today's game, or the one closest to now.",
  props: z.object({
    date: z
      .string()
      .nullable()
      .describe(
        'The game\'s date as YYYY-MM-DD, worked out from today\'s date whenever the user names a day ("last night", "on Sunday", "October 11"). Null when they name no day: the card shows the team\'s current game, today\'s or the closest one to now.'
      ),
    team: z
      .string()
      .describe(
        'The NBA team\'s full name, e.g. "Los Angeles Lakers". Use one of the two teams when the user names a matchup.'
      ),
  }),
};

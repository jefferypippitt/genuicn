import { z } from "zod";

export const winProbabilityCatalogEntry = {
  description:
    "Each team's chance of winning one NBA game, in one card: both teams with their logos, a bar in each team's color showing its chance (the percent appears on hover), and what a win would pay back (1.9x for 53%). Before the game it shows ESPN's prediction, during the game the live chance, which it keeps current, and after it the result. Use it whenever the user asks who will win an NBA game, a team's odds or chances of winning, or the win probability of a game. Send the full name of one of the two teams. When the user names a day (\"tonight\", \"on Tuesday\", \"October 20\"), set date to that day as YYYY-MM-DD, worked out from today's date; otherwise date is null and the card shows today's game, or the one closest to now.",
  props: z.object({
    date: z
      .string()
      .nullable()
      .describe(
        'The game\'s date as YYYY-MM-DD, worked out from today\'s date whenever the user names a day ("tonight", "on Tuesday", "October 20"). Null when they name no day: the card shows the team\'s current game, today\'s or the closest one to now.'
      ),
    team: z
      .string()
      .describe(
        'One of the two teams\' full names, e.g. "New York Knicks". Either team finds the game.'
      ),
  }),
};

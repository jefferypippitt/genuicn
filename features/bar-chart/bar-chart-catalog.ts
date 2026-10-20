import { z } from "zod";
import { MAX_BARS, MIN_BARS } from "@/features/bar-chart/bar-chart-schema";

export const barChartCatalogEntry = {
  description: `A live bar chart for questions that compare one number across categories at one point in time: countries, states, companies, teams, energy sources, age groups ("GDP by country", "most populous US states", "US electricity by source", "top 5 car makers by sales"). The model writes a free-text topic from the user's ask; the card researches the web and draws one bar per category. Never invent the numbers — the card fetches them. Not for how one number changes over the years: that's AreaChartCard. Not for disputed historical estimates (war deaths by country): answer those with webSearch, which can give ranges.`,
  props: z.object({
    limit: z
      .number()
      .int()
      .nullable()
      .describe(
        `How many bars, ${MIN_BARS}–${MAX_BARS}: the number the user asks for ("top 5"), or null for 8.`
      ),
    topic: z
      .string()
      .describe(
        'What to compare, taken from the user\'s question — e.g. "GDP by country", "most populous US states", "US electricity generation by source".'
      ),
  }),
};

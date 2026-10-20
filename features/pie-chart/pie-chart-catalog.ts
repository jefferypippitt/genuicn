import { z } from "zod";

export const pieChartCatalogEntry = {
  description: `A live pie (donut) chart for questions about how one whole splits into its parts ("what's the US electricity mix by source?", "smartphone market share by vendor", "how is the US federal budget spent?"). Each slice is one part with its share of the whole. The model writes a free-text topic from the user's ask; the card researches the web and draws the slices, biggest first, folding the smallest into "Other". The topic is the card's title, so keep it a short phrase naming the whole and how it's split ("US electricity generation by source"). Never invent the numbers — the card fetches them. Not for categories that don't add up to a whole (the largest economies): that's BarChartCard. Not for change over time: that's AreaChartCard.`,
  props: z.object({
    topic: z
      .string()
      .describe(
        'The whole and how it splits, taken from the user\'s question — e.g. "US electricity generation by source" or "global smartphone market share by vendor".'
      ),
  }),
};

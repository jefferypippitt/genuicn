import { z } from "zod";

export const radialChartCatalogEntry = {
  description: `A live radial chart for questions about how full or how far along a few items are against the same mark ("how full are California's reservoirs?", "what share of electricity is renewable in Germany, the UK and the US?", "what percent of US adults use each social platform?"). Each item is one ring, a full ring being the mark (100%, capacity, a target). The model writes a free-text topic from the user's ask; the card researches the web and draws the rings, the largest outermost. The topic is the card's title, so keep it a short phrase naming the measure and the items ("California reservoir levels"). Never invent the numbers — the card fetches them. Not for parts of one whole: that's PieChartCard. Not for many categories: that's BarChartCard.`,
  props: z.object({
    topic: z
      .string()
      .describe(
        'The measure and the items, taken from the user\'s question — e.g. "California reservoir levels" or "renewable share of electricity in Germany, the UK and the US".'
      ),
  }),
};

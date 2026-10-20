import { z } from "zod";

export const radarChartCatalogEntry = {
  description: `A live radar (spider) chart for questions that profile one to three subjects across the same several measures on one shared scale ("compare the nutrition of an apple and a banana", "compare the top AI models on benchmarks", "iPhone vs Pixel camera scores"). Each axis is one measure and each subject is one shape. The model writes a free-text topic from the user's ask; the card researches the web and draws the web. The topic is the card's title, so keep it a short phrase naming the measures and the subjects ("Apple vs banana nutrition"). Never invent the numbers — the card fetches them. Not for one measure across many categories: that's BarChartCard. Not for parts of a whole: that's PieChartCard.`,
  props: z.object({
    topic: z
      .string()
      .describe(
        'The measures and the subjects, taken from the user\'s question — e.g. "apple vs banana nutrition" or "AI model benchmark scores".'
      ),
  }),
};

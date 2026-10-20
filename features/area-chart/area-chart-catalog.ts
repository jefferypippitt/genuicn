import { z } from "zod";
import { AREA_CHART_RANGES } from "@/features/area-chart/area-chart-schema";

export const areaChartCatalogEntry = {
  description:
    'A live area chart for questions about how a number changes over time (population, GDP, temperatures, energy share, prices, rates, and similar). The model writes a free-text topic from the user\'s ask; the card researches the web and draws the series. Never invent the numbers — the card fetches them. Not for a single total or a one-time breakdown by category ("what is US GDP by state?"): use BarChartCard, since most sources give one figure per category, not a yearly series. Set ranges to true only when a long multi-decade series benefits from a 10Y/25Y/50Y/Max switch (e.g. world population, long GDP history). Leave ranges null/false for single-window answers. When the user asks for a yearly trend per subject — "each country", "per region", "compare X and Y" — set compare to 2–6 short tab labels for the biggest subjects (e.g. topic "US electricity share by source", compare ["Coal", "Gas", "Solar", "Wind"]); keep the topic about the whole and let each tab draw one subject\'s series. ranges is ignored with compare.',
  props: z.object({
    compare: z
      .array(z.string())
      .nullable()
      .describe(
        'Short tab labels (≤ 12 characters) for subjects to compare inside the topic, e.g. ["Coal", "Gas", "Solar", "Wind"] for "US electricity share by source". Null for a single series.'
      ),
    range: z
      .enum(AREA_CHART_RANGES)
      .nullable()
      .describe(
        "Window to show first when ranges is true: 10y, 25y, 50y, or max. Null for 50y. When ranges is false/null, null means the full series (max)."
      ),
    ranges: z
      .boolean()
      .nullable()
      .describe(
        "True only when the topic is a long multi-decade series that should offer 10Y/25Y/50Y/Max tabs (population, century-scale GDP, etc.). False or null hides the tabs — use that for most asks, recent series, and one-shot answers."
      ),
    topic: z
      .string()
      .describe(
        'What to chart, taken from the user\'s question — e.g. "world population", "US solar share of electricity", "global mean temperature anomaly", "Bitcoin yearly close".'
      ),
  }),
};

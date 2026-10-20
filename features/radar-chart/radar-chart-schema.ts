import { z } from "zod";

export const RADAR_CHART_SCALES = ["number", "percent"] as const;
export type RadarChartScale = (typeof RADAR_CHART_SCALES)[number];

/**
Fewest and most spokes. Two spokes are a line; past eight the labels crowd the web.
*/
export const MIN_AXES = 3;
export const MAX_AXES = 8;

/**
Most shapes on one web. Past three the outlines tangle.
*/
export const MAX_SERIES = 3;

export interface RadarSeries {
  /**
  Who or what this shape is, e.g. "Norway".
  */
  name: string;
  /**
  One value per axis, in the axes' order. Null where the source has no figure.
  */
  values: (number | null)[];
}

export interface RadarChartData {
  /**
  The free-text topic the model (or caller) asked for.
  */
  topic: string;
  /**
  What the values measure, e.g. "Score (0–10)" or "Benchmark accuracy".
  */
  label: string;
  scale: RadarChartScale;
  /**
  The top of the scale when it has one (10 for a 0–10 index, 100 for percent scores), or null to fit the largest value.
  */
  max: number | null;
  /**
  The measures around the web, e.g. "Income" or "Safety".
  */
  axes: string[];
  series: RadarSeries[];
  /**
  Unix time in milliseconds of when the figures were looked up.
  */
  asOf: number;
  /**
  True when this is generated data, not live figures.
  */
  fake: boolean;
  /**
  Optional attribution for thinking-step sources.
  */
  sourceHref?: string;
  sourceLabel?: string;
}

/**
Structured answer the research model must return after searching the web.
*/
export const radarChartResultSchema = z.object({
  axes: z
    .array(z.string())
    .min(MIN_AXES)
    .describe(
      `The measures, ${MIN_AXES}–${MAX_AXES}, each 1–2 words, e.g. "Income", "Safety", "Health".`
    ),
  label: z
    .string()
    .describe(
      'What the values measure in 1–4 words, with the scale in brackets when it has one, e.g. "Score (0–10)", "Accuracy" or "Daily value". No serving sizes, sources or notes.'
    ),
  max: z
    .number()
    .nullable()
    .describe(
      "The top of the scale when it has one (10 for a 0–10 index, 100 for percent scores), otherwise null."
    ),
  scale: z
    .enum(RADAR_CHART_SCALES)
    .describe("percent for percentages and shares, otherwise number."),
  series: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'Who or what is measured, 1–3 words, e.g. "Apple" or "iPhone 17 Pro". No servings, sizes or notes.'
          ),
        values: z
          .array(z.number().nullable())
          .describe(
            "One value per axis, in the axes' order, null where the source has none."
          ),
      })
    )
    .min(1)
    .describe(`The subjects compared, 1–${MAX_SERIES}.`),
  sourceHref: z
    .string()
    .nullable()
    .describe("Best source URL for the numbers, or null."),
  sourceLabel: z
    .string()
    .nullable()
    .describe("Short source name, e.g. OECD or USDA."),
});
export type RadarChartResult = z.infer<typeof radarChartResultSchema>;

function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
The value at the web's outer ring: the scale's own top when it has one and nothing goes past it, otherwise a round number just above the largest value.
*/
export function radarCeiling(data: RadarChartData): number {
  const largest = Math.max(
    0,
    ...data.series.flatMap((series) =>
      series.values.filter((value) => value !== null)
    )
  );
  return data.max && data.max >= largest ? data.max : niceCeiling(largest);
}

const DECIMAL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatRadarValue(
  value: number,
  scale: RadarChartScale
): string {
  return scale === "percent"
    ? `${DECIMAL.format(value)}%`
    : DECIMAL.format(value);
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeRadarChart(data: RadarChartData): string {
  const series = data.series.map((entry) => {
    const values = data.axes.map((axis, index) => {
      const value = entry.values[index];
      return `${axis} ${value === null || value === undefined ? "no figure" : formatRadarValue(value, data.scale)}`;
    });
    return `${entry.name}: ${values.join(", ")}`;
  });
  return `${data.label}. ${series.join("; ")}.`;
}

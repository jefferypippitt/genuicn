import { z } from "zod";

export const BAR_CHART_SCALES = ["number", "percent", "currency"] as const;
export type BarChartScale = (typeof BAR_CHART_SCALES)[number];

/**
Fewest and most bars the card draws. More than MAX_BARS won't fit the card's height; fewer than MIN_BARS is nothing to compare.
*/
export const MIN_BARS = 2;
export const MAX_BARS = 12;
export const DEFAULT_BARS = 8;

/**
Clamps the model's bar count to what the card can draw; anything unusable means the default.
*/
export function barLimit(value: unknown): number {
  return typeof value !== "number" || !Number.isFinite(value)
    ? DEFAULT_BARS
    : Math.min(Math.max(Math.round(value), MIN_BARS), MAX_BARS);
}

/**
What the model sends: the tool's input.
*/
export const barChartInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(MIN_BARS)
    .max(MAX_BARS)
    .default(DEFAULT_BARS)
    .describe(
      `How many bars to draw, ${MIN_BARS}–${MAX_BARS}. Use the number the user asks for ("top 5"), otherwise ${DEFAULT_BARS}.`
    ),
  topic: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'What to compare, free text from the user\'s question — e.g. "GDP by country", "most populous US states", "US electricity generation by source".'
    ),
});
export type BarChartInput = z.infer<typeof barChartInputSchema>;

export interface BarChartBar {
  /**
  The category, e.g. "China" or "Solar".
  */
  name: string;
  value: number;
}

export interface BarChartData {
  /**
  What each bar measures, e.g. "Population" or "GDP (current US$)".
  */
  label: string;
  /**
  How to format values on the card.
  */
  scale: BarChartScale;
  /**
  The free-text topic the model (or caller) asked for.
  */
  topic: string;
  /**
  When the figures are for, e.g. "2024" or "2023–24 season".
  */
  period: string;
  /**
  The bars in the order the card draws them: biggest first, unless the categories have their own order (age bands, months).
  */
  bars: BarChartBar[];
  /**
  The bars are parts of one whole (sources of electricity, a budget), so the card's headline is their sum.
  */
  isPartsOfWhole: boolean;
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
export const barChartResultSchema = z.object({
  bars: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Short category name, e.g. China or Natural gas."),
        value: z.number(),
      })
    )
    .min(MIN_BARS)
    .describe(
      "One bar per category, all for the same period and measure, numeric values only (no units inside the number), written out in full rather than in thousands or millions."
    ),
  label: z
    .string()
    .describe(
      "What the values measure, short, with the unit but no multiplier, e.g. Population, GDP (current US$) or Net generation (MWh)."
    ),
  ordered: z
    .boolean()
    .describe(
      "True when the categories have their own order (age bands, months, ranks over time); keep it. False to sort biggest first."
    ),
  partsOfWhole: z
    .boolean()
    .describe(
      "True when the bars together make up one total (sources of a country's electricity, a budget by department). False for separate things side by side (countries' GDP)."
    ),
  period: z
    .string()
    .describe('When the figures are for, e.g. "2024" or "2023–24".'),
  scale: z
    .enum(BAR_CHART_SCALES)
    .describe("number for counts, percent for rates, currency for money."),
  sourceHref: z
    .string()
    .nullable()
    .describe("Best source URL for the numbers, or null."),
  sourceLabel: z
    .string()
    .nullable()
    .describe("Short source name, e.g. World Bank or US EIA."),
});
export type BarChartResult = z.infer<typeof barChartResultSchema>;

/**
Whether the headline is the bars' sum. Shares in percent add up to about 100%, which says nothing, so those lead with the biggest bar instead.
*/
export function shouldShowTotal(data: BarChartData): boolean {
  return data.isPartsOfWhole && data.scale !== "percent";
}

/**
The sum of every bar, for an `isPartsOfWhole` chart.
*/
export function barTotal(data: BarChartData): number {
  return data.bars.reduce((sum, bar) => sum + bar.value, 0);
}

/**
The bar with the largest value: the headline of a chart that isn't parts of a whole.
*/
export function topBar(data: BarChartData): BarChartBar | undefined {
  let top: BarChartBar | undefined;
  for (const bar of data.bars) {
    if (!top || bar.value > top.value) {
      top = bar;
    }
  }
  return top;
}

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  });
  return formatter.format(value);
}

function formatPlain(value: number, maximumFractionDigits: number): string {
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits });
  return formatter.format(value);
}

function numberFractionDigits(absolute: number): number {
  if (absolute >= 100) {
    return 0;
  }
  return absolute >= 10 ? 1 : 2;
}

const MAGNITUDES = [
  { divisor: 1_000_000_000_000, suffix: "T" },
  { divisor: 1_000_000_000, suffix: "B" },
  { divisor: 1_000_000, suffix: "M" },
  { divisor: 1000, suffix: "K" },
] as const;

/**
Values above this read better as "12.3K" than "12,345" on a narrow card.
*/
const COMPACT_THOUSANDS_FROM = 100_000;

function compactMagnitude(absolute: number) {
  return MAGNITUDES.find(
    ({ divisor }) =>
      absolute >= divisor &&
      (divisor > 1000 || absolute >= COMPACT_THOUSANDS_FROM)
  );
}

export function formatBarValue(
  value: number,
  scale: BarChartScale,
  isCompact = true
): string {
  if (scale === "percent") {
    return `${value.toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
  }
  const absolute = Math.abs(value);
  const magnitude = isCompact ? compactMagnitude(absolute) : undefined;
  if (!magnitude) {
    return scale === "currency"
      ? formatCurrency(value)
      : formatPlain(value, numberFractionDigits(absolute));
  }
  const scaled = value / magnitude.divisor;
  const digits = Math.abs(scaled) >= 100 ? 0 : 1;
  return `${scale === "currency" ? "$" : ""}${scaled.toFixed(digits)}${magnitude.suffix}`;
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeBarChart(data: BarChartData): string {
  const shown = data.bars
    .map((bar) => `${bar.name} ${formatBarValue(bar.value, data.scale, false)}`)
    .join(", ");
  if (shouldShowTotal(data)) {
    const total = formatBarValue(barTotal(data), data.scale, false);
    return `${data.label}, ${data.period}: ${total} in total. ${shown}.`;
  }
  return `${data.label}, ${data.period}: ${shown}.`;
}

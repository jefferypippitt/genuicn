import { z } from "zod";

export const PIE_CHART_SCALES = ["number", "percent", "currency"] as const;
export type PieChartScale = (typeof PIE_CHART_SCALES)[number];

/**
Fewest and most slices the donut draws. One slice is the whole; past six the thin ones can't be told apart, so the rest fold into "Other".
*/
export const MIN_SLICES = 2;
export const MAX_SLICES = 6;

/**
The label of the slice the smallest parts fold into.
*/
export const OTHER_LABEL = "Other";

/**
How sources name their leftovers: "Other", "Others", "All other", "Other providers". A named group like "Other renewables" is a part of its own.
*/
const OTHER_NAMES =
  /^(?:all\s+)?others?(?:\s+(?:providers|vendors|companies|brands|countries|sources))?$/iu;

export interface PieSlice {
  /**
  The part, e.g. "Natural gas" or "Apple".
  */
  label: string;
  value: number;
}

export interface PieChartData {
  /**
  The free-text topic the model (or caller) asked for.
  */
  topic: string;
  /**
  What the values measure, e.g. "Electricity generation (TWh)" or "Market share".
  */
  label: string;
  scale: PieChartScale;
  /**
  The period the breakdown is for, e.g. "2025" or "Q2 2026".
  */
  period: string | null;
  /**
  Biggest first, with "Other" last when small parts were folded together.
  */
  slices: PieSlice[];
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
export const pieChartResultSchema = z.object({
  label: z
    .string()
    .describe(
      'What the values measure in 2–5 words, with the unit in brackets when it isn\'t a share, e.g. "Electricity generation (TWh)" or "Market share". No sources, places or notes: the title has those.'
    ),
  period: z
    .string()
    .nullable()
    .describe('The period the breakdown is for, e.g. "2025", or null.'),
  scale: z
    .enum(PIE_CHART_SCALES)
    .describe(
      "percent when the values are shares of 100, currency for money in USD, otherwise number."
    ),
  slices: z
    .array(
      z.object({
        label: z
          .string()
          .describe('The part\'s short name, 1–3 words, e.g. "Natural gas".'),
        value: z.number(),
      })
    )
    .min(MIN_SLICES)
    .describe(
      "Every part of the whole, as the source lists them, together adding up to the whole. Positive numbers only, written out in full."
    ),
  sourceHref: z
    .string()
    .nullable()
    .describe("Best source URL for the numbers, or null."),
  sourceLabel: z
    .string()
    .nullable()
    .describe("Short source name, e.g. US EIA or IDC."),
});
export type PieChartResult = z.infer<typeof pieChartResultSchema>;

/**
Biggest first, keeping five parts and folding the rest (and any "Other" the source already had) into one "Other" slice, so the donut never has more than six.
*/
export function foldSlices(slices: readonly PieSlice[]): PieSlice[] {
  const isOther = (slice: PieSlice) => OTHER_NAMES.test(slice.label.trim());
  const parts = slices
    .filter((slice) => !isOther(slice))
    .toSorted((a, b) => b.value - a.value);
  const listedOther = slices
    .filter(isOther)
    .reduce((sum, slice) => sum + slice.value, 0);
  const otherSlots = listedOther ? 1 : 0;
  const kept =
    parts.length + otherSlots > MAX_SLICES
      ? parts.slice(0, MAX_SLICES - 1)
      : parts;
  const other =
    listedOther +
    parts.slice(kept.length).reduce((sum, slice) => sum + slice.value, 0);
  return other ? [...kept, { label: OTHER_LABEL, value: other }] : kept;
}

export function pieTotal(data: PieChartData): number {
  return data.slices.reduce((sum, slice) => sum + slice.value, 0);
}

export function sliceShare(slice: PieSlice, total: number): number {
  return total ? slice.value / total : 0;
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
Values above this read better as "12.3K" than "12,345" in the legend.
*/
const COMPACT_THOUSANDS_FROM = 100_000;

function compactMagnitude(absolute: number) {
  return MAGNITUDES.find(
    ({ divisor }) =>
      absolute >= divisor &&
      (divisor > 1000 || absolute >= COMPACT_THOUSANDS_FROM)
  );
}

const DECIMAL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatPieValue(
  value: number,
  scale: PieChartScale,
  isCompact = true
): string {
  if (scale === "percent") {
    return `${DECIMAL.format(value)}%`;
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

const SHARE_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "percent",
});

/**
A slice's share of the whole, e.g. "38%"; anything under half a percent reads "<1%" rather than a misleading "0%".
*/
export function formatShare(share: number): string {
  return share > 0 && share < 0.005 ? "<1%" : SHARE_FORMAT.format(share);
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizePieChart(data: PieChartData): string {
  const total = pieTotal(data);
  const slices = data.slices.map(
    (slice) =>
      `${slice.label} ${formatShare(sliceShare(slice, total))} (${formatPieValue(slice.value, data.scale, false)})`
  );
  const period = data.period ? ` in ${data.period}` : "";
  return `${data.label}${period}: ${slices.join(", ")}.`;
}

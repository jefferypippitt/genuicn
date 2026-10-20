import { z } from "zod";

export const RADIAL_CHART_SCALES = ["number", "percent", "currency"] as const;
export type RadialChartScale = (typeof RADIAL_CHART_SCALES)[number];

/**
Fewest and most rings. One ring is a gauge, not a comparison; past five the inner rings get too short to read.
*/
export const MIN_RINGS = 2;
export const MAX_RINGS = 5;

export interface RadialRing {
  /**
  What the ring measures, e.g. "Shasta" or "Germany".
  */
  name: string;
  value: number;
}

export interface RadialChartData {
  /**
  The free-text topic the model (or caller) asked for.
  */
  topic: string;
  /**
  What the values measure, e.g. "Percent of capacity" or "Renewable share".
  */
  label: string;
  scale: RadialChartScale;
  /**
  The value of a full ring: 100 for a share, a capacity or a target, or null to fit the largest value.
  */
  max: number | null;
  /**
  Biggest first, so the outer (longest) ring leads.
  */
  rings: RadialRing[];
  /**
  The period the figures are for, e.g. "2025" or "Oct 18, 2026".
  */
  period: string | null;
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
export const radialChartResultSchema = z.object({
  label: z
    .string()
    .describe(
      'What the values measure in 2–5 words, e.g. "Percent of capacity" or "Renewable share". No sources, places or notes: the title has those.'
    ),
  max: z
    .number()
    .nullable()
    .describe(
      "The value of a full ring: 100 for shares and percent of capacity, the target when there is one, otherwise null."
    ),
  period: z
    .string()
    .nullable()
    .describe(
      'The period the figures are for, short, e.g. "2025", "Jun 2026" or "Oct 18, 2026", or null.'
    ),
  rings: z
    .array(
      z.object({
        name: z
          .string()
          .describe('A short name, 1–3 words, e.g. "Shasta" or "Germany".'),
        value: z.number(),
      })
    )
    .min(MIN_RINGS)
    .describe(
      `The items, ${MIN_RINGS}–${MAX_RINGS}. Non-negative numbers only, written out in full.`
    ),
  scale: z
    .enum(RADIAL_CHART_SCALES)
    .describe(
      "percent for rates and shares, currency for money in USD, otherwise number."
    ),
  sourceHref: z
    .string()
    .nullable()
    .describe("Best source URL for the numbers, or null."),
  sourceLabel: z
    .string()
    .nullable()
    .describe("Short source name, e.g. California DWR or Ember."),
});
export type RadialChartResult = z.infer<typeof radialChartResultSchema>;

/**
The value of a full ring: the given max when nothing goes past it, otherwise the largest value, so the leader closes its ring.
*/
export function radialCeiling(data: RadialChartData): number {
  const largest = Math.max(0, ...data.rings.map((ring) => ring.value));
  return data.max && data.max >= largest ? data.max : largest || 1;
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
Values above this read better as "12.3K" than "12,345" beside a ring.
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

export function formatRadialValue(
  value: number,
  scale: RadialChartScale,
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

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeRadialChart(data: RadialChartData): string {
  const ceiling = radialCeiling(data);
  const rings = data.rings.map(
    (ring) => `${ring.name} ${formatRadialValue(ring.value, data.scale, false)}`
  );
  return `${data.label}, out of ${formatRadialValue(ceiling, data.scale, false)}: ${rings.join(", ")}.`;
}

import { z } from "zod";

export const AREA_CHART_RANGES = ["10y", "25y", "50y", "max"] as const;
export type AreaChartRange = (typeof AREA_CHART_RANGES)[number];

export const AREA_CHART_SCALES = ["number", "percent", "currency"] as const;
export type AreaChartScale = (typeof AREA_CHART_SCALES)[number];

export const RANGE_LABEL: Record<AreaChartRange, string> = {
  "10y": "10Y",
  "25y": "25Y",
  "50y": "50Y",
  max: "Max",
};

export function isAreaChartRange(value: unknown): value is AreaChartRange {
  return (
    typeof value === "string" &&
    (AREA_CHART_RANGES as readonly string[]).includes(value)
  );
}

/**
Most subject tabs a compare card shows; more won't fit the card's width.
*/
export const MAX_COMPARE = 6;

/**
Cleans the model's compare labels: trimmed, no blanks or repeats, at most MAX_COMPARE. Fewer than two subjects means there's nothing to compare.
*/
export function compareSubjects(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const subjects = [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_COMPARE);
  return subjects.length >= 2 ? subjects : [];
}

/**
What the model sends: the tool's input.
*/
export const areaChartInputSchema = z.object({
  compare: z
    .array(z.string().min(1).max(24))
    .max(MAX_COMPARE)
    .default([])
    .describe(
      'Short tab labels for subjects to compare inside the topic, e.g. ["Coal", "Gas", "Solar", "Wind"]. Each tab draws its own series. Empty for a single series.'
    ),
  range: z
    .enum(AREA_CHART_RANGES)
    .default("50y")
    .describe(
      "Window to show first when ranges is true: 10y, 25y, 50y, or max. When ranges is off, prefer max for the full series."
    ),
  ranges: z
    .boolean()
    .default(false)
    .describe(
      "True only for long multi-decade series that need 10Y/25Y/50Y/Max tabs. False for most area charts."
    ),
  topic: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'What to chart, free text from the user\'s question — e.g. "world population", "US renewable electricity share", "Bitcoin price yearly", "global average temperature anomaly".'
    ),
});
export type AreaChartInput = z.infer<typeof areaChartInputSchema>;

/**
Whether the area-chart range tabs should render. Opt-in from the model.
*/
export function shouldShowAreaChartRanges(value: unknown): boolean {
  return value === true;
}

export interface AreaChartPoint {
  /**
  Year, or Unix ms for denser series. Prefer year for annual data.
  */
  year: number;
  value: number;
}

export interface AreaChartData {
  /**
  Short title for the subject, e.g. "World" or "United States".
  */
  place: string;
  /**
  What the series measures, e.g. "Population" or "GDP (current US$)".
  */
  label: string;
  /**
  How to format values on the card.
  */
  scale: AreaChartScale;
  /**
  The free-text topic the model (or caller) asked for.
  */
  topic: string;
  range: AreaChartRange;
  /**
  Latest value in the (possibly filtered) series.
  */
  value: number;
  /**
  Change from the first point in the window to the latest.
  */
  change: number;
  changePercent: number;
  points: AreaChartPoint[];
  /**
  Unix time in milliseconds of when the series was built.
  */
  asOf: number;
  /**
  True when this is generated data, not a live series.
  */
  fake: boolean;
  /**
  Optional attribution for thinking-step sources.
  */
  sourceHref?: string;
  sourceLabel?: string;
  /**
  Yearly amounts over a finished period: the card's headline is their sum, not the last year.
  */
  isPeriodTotal?: boolean;
  /**
  One series per compare tab, in tab order. `points` and `place` above are
  the first subject's. Absent for a single series.
  */
  subjects?: AreaChartSubject[];
}

export interface AreaChartSubject {
  /**
  The tab label the model asked for, e.g. "Solar".
  */
  name: string;
  points: AreaChartPoint[];
}

/**
Structured answer the research model must return after searching the web.
*/
export const areaChartSeriesSchema = z.object({
  additive: z
    .boolean()
    .describe(
      "True when each value is an amount during that year that adds up across years (deaths, sales, emissions per year). False for a level at a point in time (population, price, share, temperature)."
    ),
  label: z
    .string()
    .describe("What the series measures, short, e.g. Population or GDP."),
  ongoing: z
    .boolean()
    .describe(
      "True when the measure keeps being published (population, prices, emissions). False for a finished period whose series ends when it ended."
    ),
  place: z
    .string()
    .describe("Who or where the series is about, e.g. World or United States."),
  points: z
    .array(
      z.object({
        value: z.number(),
        year: z.number().int().describe("Calendar year of the observation."),
      })
    )
    .min(2)
    .describe(
      "Time series points, oldest first, exactly one per year, at least two years."
    ),
  scale: z
    .enum(AREA_CHART_SCALES)
    .describe("number for counts, percent for rates, currency for money."),
  sourceHref: z
    .string()
    .nullable()
    .describe("Best source URL for the numbers, or null."),
  sourceLabel: z
    .string()
    .nullable()
    .describe("Short source name, e.g. World Bank or Our World in Data."),
});
export type AreaChartSeriesResult = z.infer<typeof areaChartSeriesSchema>;

const MIN_WINDOW_POINTS = 2;

export function filterPointsByRange(
  points: AreaChartPoint[],
  range: AreaChartRange
): AreaChartPoint[] {
  if (range === "max" || points.length < MIN_WINDOW_POINTS) {
    return points;
  }
  const end = points.at(-1)?.year ?? 0;
  const span = { "10y": 10, "25y": 25, "50y": 50 }[range];
  const start = end - (span - 1);
  const filtered = points.filter((point) => point.year >= start);
  return filtered.length >= MIN_WINDOW_POINTS
    ? filtered
    : points.slice(-MIN_WINDOW_POINTS);
}

/**
Whether a range tab shows anything Max doesn't: false when the whole series already fits inside the window, so 25Y/50Y on a 16-year series is disabled.
*/
export function isRangeDistinct(
  points: AreaChartPoint[],
  range: AreaChartRange
): boolean {
  return (
    range === "max" || filterPointsByRange(points, range).length < points.length
  );
}

export function withRange(
  data: AreaChartData,
  range: AreaChartRange
): AreaChartData {
  const points = filterPointsByRange(data.points, range);
  const [first] = points;
  const last = points.at(-1) ?? first;
  const change = last.value - first.value;
  return {
    ...data,
    change,
    changePercent: first.value ? (change / first.value) * 100 : 0,
    points,
    range,
    value: last.value,
  };
}

/**
The card's view of one compare tab: that subject's points, as a Max series.
*/
export function withSubject(
  data: AreaChartData,
  subject: AreaChartSubject
): AreaChartData {
  return withRange(
    { ...data, place: subject.name, points: subject.points },
    "max"
  );
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

function formatCompactMagnitude(
  value: number,
  scale: AreaChartScale,
  divisor: number,
  suffix: string,
  digits: number
): string {
  const scaled = value / divisor;
  return `${scale === "currency" ? "$" : ""}${scaled.toFixed(digits)}${suffix}`;
}

export function formatSeriesValue(
  value: number,
  scale: AreaChartScale,
  isCompact = true
): string {
  if (scale === "percent") {
    return `${value.toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
  }
  const absolute = Math.abs(value);
  if (!isCompact) {
    return scale === "currency"
      ? formatCurrency(value)
      : formatPlain(value, numberFractionDigits(absolute));
  }
  if (absolute >= 1_000_000_000_000) {
    return formatCompactMagnitude(
      value,
      scale,
      1_000_000_000_000,
      "T",
      Math.abs(value / 1_000_000_000_000) >= 10 ? 1 : 2
    );
  }
  if (absolute >= 1_000_000_000) {
    return formatCompactMagnitude(
      value,
      scale,
      1_000_000_000,
      "B",
      Math.abs(value / 1_000_000_000) >= 10 ? 1 : 2
    );
  }
  if (absolute >= 1_000_000) {
    return formatCompactMagnitude(
      value,
      scale,
      1_000_000,
      "M",
      Math.abs(value / 1_000_000) >= 100 ? 0 : 1
    );
  }
  return scale === "currency"
    ? formatCurrency(value)
    : formatPlain(value, numberFractionDigits(absolute));
}

/**
The unsigned change over the window. A percent series changes in points:
a share going from 0.0004% to 8.6% is "8.6 pts", not "+2,128,766%".
*/
export function formatChange(data: AreaChartData): string {
  const absolute = Math.abs(data.change);
  if (data.scale === "percent") {
    return `${absolute.toFixed(absolute >= 10 ? 1 : 2)} pts`;
  }
  return `${formatSeriesValue(absolute, data.scale)} (${Math.abs(data.changePercent).toFixed(1)}%)`;
}

/**
The sum of every yearly amount shown, for an `isPeriodTotal` series.
*/
export function periodTotal(data: AreaChartData): number {
  return data.points.reduce((sum, point) => sum + point.value, 0);
}

/**
The years the shown series spans, e.g. "1939–1945".
*/
export function formatPeriod(data: AreaChartData): string {
  const first = data.points[0]?.year;
  const last = data.points.at(-1)?.year;
  return first === last ? String(first) : `${first}–${last}`;
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeAreaChart(data: AreaChartData): string {
  if (data.isPeriodTotal) {
    const total = formatSeriesValue(periodTotal(data), data.scale, false);
    return `${data.place} ${data.label}: ${total} in total, ${formatPeriod(data)}.`;
  }
  const latest = formatSeriesValue(data.value, data.scale, false);
  const direction = data.change >= 0 ? "up" : "down";
  const percent =
    data.scale === "percent"
      ? `${Math.abs(data.change).toFixed(1)} points`
      : `${Math.abs(data.changePercent).toFixed(1)}%`;
  const period =
    data.range === "max"
      ? `since ${data.points[0]?.year ?? "records began"}`
      : `over the past ${{ "10y": "10 years", "25y": "25 years", "50y": "50 years" }[data.range]}`;
  return `${data.place} ${data.label} is ${latest}, ${direction} ${percent} ${period}.`;
}

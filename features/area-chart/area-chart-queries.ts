import "server-only";
import {
  createExtractTool,
  createSearchTool,
} from "@parallel-web/ai-sdk-tools";
import { generateText, isStepCount, Output } from "ai";
import {
  areaChartSeriesSchema,
  withRange,
} from "@/features/area-chart/area-chart-schema";
import type {
  AreaChartData,
  AreaChartPoint,
  AreaChartRange,
  AreaChartSeriesResult,
  AreaChartSubject,
} from "@/features/area-chart/area-chart-schema";

/**
Research copies long data tables into numbers, where Haiku 4.5 misreads
rows (it returned 13.7B people for 2025). Separate from the chat model.
*/
const DEFAULT_RESEARCH_MODEL = "anthropic/claude-haiku-5.5";

interface Budget {
  /**
  Tool steps before the model must answer. Step 0 is forced to search and step 1 to extract, so the numbers come from a page rather than memory; without a forced final answer the model keeps digging and returns nothing.
  */
  readonly steps: number;
  readonly timeoutMs: number;
}

const SERIES_BUDGET: Budget = { steps: 5, timeoutMs: 55_000 };
const COMPARE_BUDGET: Budget = { steps: 7, timeoutMs: 85_000 };
const EARLIEST_YEAR = 1800;
/**
Parallel serves cached pages by default; an extracted page older than a day is fetched live so a data table's newest release isn't missed. Search keeps the cache: a live search costs ~8s a call against ~1.5s, and it only picks URLs.
*/
const LIVE_FETCH_MAX_AGE_S = 86_400;

export class AreaChartNotFoundError extends Error {
  constructor(topic: string, options?: ErrorOptions) {
    super(`No area chart series found for "${topic}".`, options);
    this.name = "AreaChartNotFoundError";
  }
}

interface ResearchOptions {
  readonly stale?: AreaChartData;
  readonly subject?: string;
}

interface Research {
  readonly data: AreaChartData;
  readonly isOngoing: boolean;
}

function freshYear(): number {
  const today = new Date();
  return today.getUTCFullYear() - 1;
}

function latestYear(data: AreaChartData): number {
  return data.points.at(-1)?.year ?? 0;
}

function isStale({ data, isOngoing }: Research): boolean {
  return isOngoing && latestYear(data) < freshYear();
}

function staleNote(stale: AreaChartData): string {
  const source = stale.sourceHref
    ? `${stale.sourceLabel ?? "a source"} (${stale.sourceHref})`
    : (stale.sourceLabel ?? "a source");
  return `\n\nA previous attempt used ${source}, whose data stops in ${latestYear(stale)}. That is outdated. Find a different source that publishes ${freshYear()} or later, and use it for the whole series.`;
}

function subjectNote(subject?: string): string {
  return subject
    ? `\nSubject: ${subject} — chart only this subject's figures. Total or World means the sum across everyone. If no source gives yearly figures for it, fail rather than estimating.`
    : "";
}

function researchPrompt(
  topic: string,
  range: AreaChartRange,
  steps: number,
  { stale, subject }: ResearchOptions
): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const window =
    range === "max"
      ? `as many years as reliable public data allows, starting no earlier than ${EARLIEST_YEAR}`
      : `about the last ${{ "10y": "10", "25y": "25", "50y": "50" }[range]} years, plus earlier points if they help the trend`;

  return `Today is ${today.toISOString().slice(0, 10)}. Find a real public time series that answers this as an area chart:

Topic: ${topic}${subjectNote(subject)}

Requirements:
- Prefer official or well-known statistical sources (World Bank, OECD, Our World in Data, UN, NASA, national stats offices, reputable market data pages, standard reference works for history).
- Search first, then extract the best URL(s) — a data table, CSV or JSON API, not an article — and copy the numbers from it.
- Freshness matters most for a measure that is still published: the series must reach ${year - 1} (or ${year} for monthly, daily or market data). Among sources, pick the one whose latest year is newest — aggregators such as Our World in Data often lag the original publisher by a year or two. For country or world indicators the World Bank API is current: https://api.worldbank.org/v2/country/<ISO3 or WLD>/indicator/<indicator code>?format=json&per_page=100. A finished period instead covers every year it lasted, first to last: if a source is missing years, find one that has them all, or fail.
- Cover ${window}.
- Exactly one point per year: copy every year in the table, don't sample every 5 or 10 years. When a source splits a year into parts, add them up into that year's one value. Month→year averages are fine. Years before the last 50 can be sparser.
- Oldest first, numeric values only (no units inside the number).
- scale: "percent" for rates/shares, "currency" for money in USD, otherwise "number".
- You have ${steps} tool steps, then you must answer from what you extracted.
- If the topic cannot be turned into a numeric time series, fail rather than inventing numbers.${stale ? staleNote(stale) : ""}`;
}

function cleanPoints(points: readonly AreaChartPoint[]): AreaChartPoint[] {
  const byYear = new Map<number, number>();
  for (const { year, value } of points) {
    if (
      Number.isFinite(year) &&
      Number.isFinite(value) &&
      year >= EARLIEST_YEAR
    ) {
      byYear.set(year, value);
    }
  }
  return [...byYear]
    .map(([year, value]) => ({ value, year }))
    .toSorted((left, right) => left.year - right.year);
}

function toAreaChartData(
  query: string,
  range: AreaChartRange,
  output: AreaChartSeriesResult
): AreaChartData {
  const points = cleanPoints(output.points);
  if (points.length < 2) {
    throw new AreaChartNotFoundError(query);
  }
  return withRange(
    {
      asOf: Date.now(),
      change: 0,
      changePercent: 0,
      fake: false,
      isPeriodTotal: output.additive && !output.ongoing,
      label: output.label.trim() || "Series",
      place: output.place.trim() || query,
      points,
      range: "max",
      scale: output.scale,
      sourceHref: output.sourceHref ?? undefined,
      sourceLabel: output.sourceLabel ?? undefined,
      topic: query,
      value: 0,
    },
    range
  );
}

async function researchOnce(
  query: string,
  range: AreaChartRange,
  abortSignal: AbortSignal,
  options: ResearchOptions
): Promise<Research> {
  const { steps } = options.subject ? COMPARE_BUDGET : SERIES_BUDGET;
  const model = process.env.AREA_CHART_MODEL || DEFAULT_RESEARCH_MODEL;
  const webSearch = createSearchTool({
    client_model: model,
    max_results: 8,
    mode: "advanced",
  });
  const webExtract = createExtractTool({
    client_model: model,
    fetch_policy: { max_age_seconds: LIVE_FETCH_MAX_AGE_S },
  });

  const { output } = await generateText({
    abortSignal,
    instructions:
      "You turn questions into honest yearly time series for a generative UI area chart. Never invent, interpolate or recall figures from memory: every value must come from a page you extracted.",
    model,
    output: Output.object({ schema: areaChartSeriesSchema }),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: { toolName: "webSearch", type: "tool" } };
      }
      if (stepNumber === 1) {
        return { toolChoice: { toolName: "webExtract", type: "tool" } };
      }
      return stepNumber >= steps ? { toolChoice: "none" } : {};
    },
    prompt: researchPrompt(query, range, steps, options),
    stopWhen: isStepCount(steps + 1),
    tools: {
      webExtract,
      webSearch,
    },
  });

  if (!output?.points?.length) {
    throw new AreaChartNotFoundError(query);
  }

  return {
    data: toAreaChartData(query, range, output),
    isOngoing: output.ongoing,
  };
}

async function researchAreaChart(
  query: string,
  range: AreaChartRange,
  subject?: string
): Promise<AreaChartData> {
  const { timeoutMs } = subject ? COMPARE_BUDGET : SERIES_BUDGET;
  const abortSignal = AbortSignal.timeout(timeoutMs);
  let first: Research;
  try {
    first = await researchOnce(query, range, abortSignal, { subject });
  } catch (error) {
    if (abortSignal.aborted) {
      throw error;
    }
    const retry = await researchOnce(query, range, abortSignal, { subject });
    return retry.data;
  }
  if (!isStale(first)) {
    return first.data;
  }
  let second = first;
  try {
    second = await researchOnce(query, range, abortSignal, {
      stale: first.data,
      subject,
    });
  } catch (error) {
    if (abortSignal.aborted) {
      throw error;
    }
  }
  return latestYear(second.data) > latestYear(first.data)
    ? second.data
    : first.data;
}

function hasGaps(points: readonly AreaChartPoint[]): boolean {
  return points.some(
    (point, index) => index > 0 && point.year - points[index - 1].year > 1
  );
}

async function researchCompare(
  query: string,
  compare: readonly string[]
): Promise<AreaChartData> {
  const results = await Promise.allSettled(
    compare.map((name) => researchAreaChart(query, "max", name))
  );
  const found: { data: AreaChartData; subject: AreaChartSubject }[] = [];
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled" && !hasGaps(result.value.points)) {
      found.push({
        data: result.value,
        subject: { name: compare[index], points: result.value.points },
      });
    }
  }
  const [first] = found;
  if (!first) {
    throw new AreaChartNotFoundError(query);
  }
  return {
    ...first.data,
    place: first.subject.name,
    subjects: found.map(({ subject }) => subject),
  };
}

/**
Research a free-text topic on the web (Parallel search + extract) and shape
it into an area-chart series. With `compare`, one series per subject comes
back for the card's tabs.
*/
export async function getAreaChart(
  topic: string,
  range: AreaChartRange = "50y",
  compare: readonly string[] = []
): Promise<AreaChartData> {
  const query = topic.trim();
  if (!query) {
    throw new AreaChartNotFoundError(topic);
  }
  if (!process.env.PARALLEL_API_KEY) {
    throw new Error(
      "PARALLEL_API_KEY is missing. Add it to .env.local to load live area charts."
    );
  }

  const research =
    compare.length > 0
      ? () => researchCompare(query, compare)
      : () => researchAreaChart(query, range);
  try {
    return await research();
  } catch (error) {
    if (error instanceof AreaChartNotFoundError) {
      throw error;
    }
    if (Error.isError(error) && /PARALLEL_API_KEY/u.test(error.message)) {
      throw error;
    }
    throw new AreaChartNotFoundError(query, { cause: error });
  }
}

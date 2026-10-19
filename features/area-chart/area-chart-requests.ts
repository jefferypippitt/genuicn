import { withRange } from "@/features/area-chart/area-chart-schema";
import type {
  AreaChartData,
  AreaChartRange,
} from "@/features/area-chart/area-chart-schema";

const sharedAreaChartRequests = new Map<
  string,
  { expiresAt: number; chart: Promise<AreaChartData> }
>();
const REUSE_MS = 120_000;

export interface LoadAreaChartOptions {
  /**
  When true, fetch the widest series once and filter client-side for the 10Y/25Y/50Y/Max tabs. When false, fetch only the requested window.
  */
  readonly ranges?: boolean;
  /**
  Subject tabs, e.g. ["Coal", "Solar"]. When given, one full series per subject comes back in `subjects`, and `range`/`ranges` don't apply.
  */
  readonly compare?: readonly string[];
}

function topicKey(topic: string) {
  return topic.trim().toLowerCase();
}

function cacheKey(
  topic: string,
  range: AreaChartRange,
  hasRanges: boolean,
  compare: readonly string[] = []
) {
  if (compare.length > 0) {
    return `${topicKey(topic)}|${compare.join("|").toLowerCase()}`;
  }
  return hasRanges ? topicKey(topic) : `${topicKey(topic)}:${range}`;
}

function areaChartUrl(
  topic: string,
  range: AreaChartRange,
  compare: readonly string[] = []
) {
  const parameters = new URLSearchParams({ range, topic });
  for (const subject of compare) {
    parameters.append("compare", subject);
  }
  return `/api/area-chart?${parameters}`;
}

async function fetchAreaChart(
  topic: string,
  range: AreaChartRange,
  compare: readonly string[]
) {
  const response = await fetch(areaChartUrl(topic, range, compare));
  const body = (await response.json()) as AreaChartData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Area chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestAreaChart(
  key: string,
  topic: string,
  range: AreaChartRange,
  compare: readonly string[]
) {
  try {
    return await fetchAreaChart(topic, range, compare);
  } catch (error) {
    sharedAreaChartRequests.delete(key);
    throw error;
  }
}

async function chartForRange(
  chart: Promise<AreaChartData>,
  range: AreaChartRange
) {
  const data = await chart;
  return withRange(data, range);
}

/**
Load an area-chart series. Pass `ranges: true` only when the card will show
the incremental window tabs — that path caches the full series by topic.
*/
export function loadAreaChart(
  topic: string,
  range: AreaChartRange,
  options: LoadAreaChartOptions = {}
) {
  const compare = options.compare ?? [];
  if (compare.length > 0) {
    const key = cacheKey(topic, "max", false, compare);
    const hit = sharedAreaChartRequests.get(key);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.chart;
    }
    const chart = requestAreaChart(key, topic, "max", compare);
    sharedAreaChartRequests.set(key, {
      chart,
      expiresAt: Date.now() + REUSE_MS,
    });
    return chart;
  }
  const hasRanges = options.ranges === true;
  const key = cacheKey(topic, range, hasRanges);
  const hit = sharedAreaChartRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hasRanges ? chartForRange(hit.chart, range) : hit.chart;
  }
  const fetchRange = hasRanges ? "max" : range;
  const chart = requestAreaChart(key, topic, fetchRange, []);
  sharedAreaChartRequests.set(key, {
    chart,
    expiresAt: Date.now() + REUSE_MS,
  });
  return hasRanges ? chartForRange(chart, range) : chart;
}

/**
Seed the client cache from a docs recording. Always stores the exact window;
also stores a full-series entry when `range` is max so range tabs can filter.
A compare recording is stored under its subjects.
*/
export function primeAreaChart(
  topic: string,
  range: AreaChartRange,
  data: AreaChartData,
  compare: readonly string[] = []
) {
  if (compare.length > 0) {
    sharedAreaChartRequests.set(cacheKey(topic, range, false, compare), {
      chart: Promise.resolve(data),
      expiresAt: Infinity,
    });
    return;
  }
  sharedAreaChartRequests.set(cacheKey(topic, range, false), {
    chart: Promise.resolve(data),
    expiresAt: Infinity,
  });
  if (range === "max") {
    sharedAreaChartRequests.set(topicKey(topic), {
      chart: Promise.resolve({ ...data, range: "max" }),
      expiresAt: Infinity,
    });
  }
}

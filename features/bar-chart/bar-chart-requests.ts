import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";

const sharedBarChartRequests = new Map<
  string,
  { expiresAt: number; chart: Promise<BarChartData> }
>();
const REUSE_MS = 120_000;

function cacheKey(topic: string, limit: number) {
  return `${topic.trim().toLowerCase()}:${limit}`;
}

function barChartUrl(topic: string, limit: number) {
  const parameters = new URLSearchParams({ limit: String(limit), topic });
  return `/api/bar-chart?${parameters}`;
}

async function fetchBarChart(topic: string, limit: number) {
  const response = await fetch(barChartUrl(topic, limit));
  const body = (await response.json()) as BarChartData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Bar chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestBarChart(key: string, topic: string, limit: number) {
  try {
    return await fetchBarChart(topic, limit);
  } catch (error) {
    sharedBarChartRequests.delete(key);
    throw error;
  }
}

/**
Load a bar chart's figures. Shared, so the thinking steps and the card make one request between them.
*/
export function loadBarChart(topic: string, limit: number) {
  const key = cacheKey(topic, limit);
  const hit = sharedBarChartRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.chart;
  }
  const chart = requestBarChart(key, topic, limit);
  sharedBarChartRequests.set(key, {
    chart,
    expiresAt: Date.now() + REUSE_MS,
  });
  return chart;
}

/**
Seed the client cache from a docs recording.
*/
export function primeBarChart(
  topic: string,
  limit: number,
  data: BarChartData
) {
  sharedBarChartRequests.set(cacheKey(topic, limit), {
    chart: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

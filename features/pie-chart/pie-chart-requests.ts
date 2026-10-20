import type { PieChartData } from "@/features/pie-chart/pie-chart-schema";

const sharedPieChartRequests = new Map<
  string,
  { chart: Promise<PieChartData>; expiresAt: number }
>();
const REUSE_MS = 120_000;

function cacheKey(topic: string) {
  return topic.trim().toLowerCase();
}

function pieChartUrl(topic: string) {
  const parameters = new URLSearchParams({ topic });
  return `/api/pie-chart?${parameters}`;
}

async function fetchPieChart(topic: string) {
  const response = await fetch(pieChartUrl(topic));
  const body = (await response.json()) as PieChartData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Pie chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestPieChart(key: string, topic: string) {
  try {
    return await fetchPieChart(topic);
  } catch (error) {
    sharedPieChartRequests.delete(key);
    throw error;
  }
}

/**
Load a pie chart's figures. Shared, so the thinking steps and the card make one request between them.
*/
export function loadPieChart(topic: string) {
  const key = cacheKey(topic);
  const hit = sharedPieChartRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.chart;
  }
  const chart = requestPieChart(key, topic);
  sharedPieChartRequests.set(key, {
    chart,
    expiresAt: Date.now() + REUSE_MS,
  });
  return chart;
}

/**
Seed the client cache from a docs recording.
*/
export function primePieChart(topic: string, data: PieChartData) {
  sharedPieChartRequests.set(cacheKey(topic), {
    chart: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

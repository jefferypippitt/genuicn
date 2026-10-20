import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";

const sharedRadialChartRequests = new Map<
  string,
  { chart: Promise<RadialChartData>; expiresAt: number }
>();
const REUSE_MS = 120_000;

function cacheKey(topic: string) {
  return topic.trim().toLowerCase();
}

function radialChartUrl(topic: string) {
  const parameters = new URLSearchParams({ topic });
  return `/api/radial-chart?${parameters}`;
}

async function fetchRadialChart(topic: string) {
  const response = await fetch(radialChartUrl(topic));
  const body = (await response.json()) as RadialChartData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Radial chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestRadialChart(key: string, topic: string) {
  try {
    return await fetchRadialChart(topic);
  } catch (error) {
    sharedRadialChartRequests.delete(key);
    throw error;
  }
}

/**
Load a radial chart's figures. Shared, so the thinking steps and the card make one request between them.
*/
export function loadRadialChart(topic: string) {
  const key = cacheKey(topic);
  const hit = sharedRadialChartRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.chart;
  }
  const chart = requestRadialChart(key, topic);
  sharedRadialChartRequests.set(key, {
    chart,
    expiresAt: Date.now() + REUSE_MS,
  });
  return chart;
}

/**
Seed the client cache from a docs recording.
*/
export function primeRadialChart(topic: string, data: RadialChartData) {
  sharedRadialChartRequests.set(cacheKey(topic), {
    chart: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

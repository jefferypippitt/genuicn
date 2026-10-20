import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";

const sharedRadarChartRequests = new Map<
  string,
  { chart: Promise<RadarChartData>; expiresAt: number }
>();
const REUSE_MS = 120_000;

function cacheKey(topic: string) {
  return topic.trim().toLowerCase();
}

function radarChartUrl(topic: string) {
  const parameters = new URLSearchParams({ topic });
  return `/api/radar-chart?${parameters}`;
}

async function fetchRadarChart(topic: string) {
  const response = await fetch(radarChartUrl(topic));
  const body = (await response.json()) as RadarChartData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Radar chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestRadarChart(key: string, topic: string) {
  try {
    return await fetchRadarChart(topic);
  } catch (error) {
    sharedRadarChartRequests.delete(key);
    throw error;
  }
}

/**
Load a radar chart's figures. Shared, so the thinking steps and the card make one request between them.
*/
export function loadRadarChart(topic: string) {
  const key = cacheKey(topic);
  const hit = sharedRadarChartRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.chart;
  }
  const chart = requestRadarChart(key, topic);
  sharedRadarChartRequests.set(key, {
    chart,
    expiresAt: Date.now() + REUSE_MS,
  });
  return chart;
}

/**
Seed the client cache from a docs recording.
*/
export function primeRadarChart(topic: string, data: RadarChartData) {
  sharedRadarChartRequests.set(cacheKey(topic), {
    chart: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

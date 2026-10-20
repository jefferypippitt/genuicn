import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";

/**
Demo profile for offline tests. Not used by the live Parallel path.
*/
export function fakeRadarChart(
  topic: string,
  now = Date.UTC(2026, 9, 18, 12, 0)
): RadarChartData {
  return {
    asOf: now,
    axes: ["Income", "Jobs", "Health", "Safety", "Education", "Environment"],
    fake: true,
    label: "Score (0–10)",
    max: 10,
    scale: "number",
    series: [
      { name: "Norway", values: [5.4, 8.6, 8.5, 9.6, 7.1, 8.9] },
      { name: "Japan", values: [3.9, 8.1, 7.3, 9.8, 8.9, 6.2] },
    ],
    topic: topic.trim() || "Better Life Index: Norway vs Japan",
  };
}

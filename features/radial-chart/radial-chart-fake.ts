import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";

/**
Demo rings for offline tests. Not used by the live Parallel path.
*/
export function fakeRadialChart(
  topic: string,
  now = Date.UTC(2026, 9, 18, 12, 0)
): RadialChartData {
  return {
    asOf: now,
    fake: true,
    label: "Percent of capacity",
    max: 100,
    period: "Oct 18, 2026",
    rings: [
      { name: "Shasta", value: 71 },
      { name: "Oroville", value: 64 },
      { name: "Trinity", value: 58 },
      { name: "San Luis", value: 37 },
    ],
    scale: "percent",
    topic: topic.trim() || "California reservoir levels",
  };
}

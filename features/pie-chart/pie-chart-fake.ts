import type { PieChartData } from "@/features/pie-chart/pie-chart-schema";

/**
Demo breakdown for offline tests. Not used by the live Parallel path.
*/
export function fakePieChart(
  topic: string,
  now = Date.UTC(2026, 9, 18, 12, 0)
): PieChartData {
  return {
    asOf: now,
    fake: true,
    label: "Electricity generation (TWh)",
    period: "2025",
    scale: "number",
    slices: [
      { label: "Natural gas", value: 1802 },
      { label: "Nuclear", value: 782 },
      { label: "Coal", value: 653 },
      { label: "Wind", value: 464 },
      { label: "Solar", value: 303 },
      { label: "Other", value: 381 },
    ],
    topic: topic.trim() || "US electricity generation by source",
  };
}

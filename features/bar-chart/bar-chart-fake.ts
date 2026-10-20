import type {
  BarChartBar,
  BarChartData,
} from "@/features/bar-chart/bar-chart-schema";

const DEMO_BARS: BarChartBar[] = [
  { name: "India", value: 1_450_935_791 },
  { name: "China", value: 1_419_321_278 },
  { name: "United States", value: 345_426_571 },
  { name: "Indonesia", value: 283_487_931 },
  { name: "Pakistan", value: 251_269_164 },
  { name: "Nigeria", value: 232_679_478 },
  { name: "Brazil", value: 211_998_573 },
  { name: "Bangladesh", value: 173_562_364 },
];

/**
A linear congruential generator (Numerical Recipes' constants) seeded from a string, so a topic always gets the same demo bars. Every product stays under 2^53, so plain arithmetic is exact.
*/
const LCG_MODULUS = 2 ** 32;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const SEED_BASE = 31;

function seeded(seed: string) {
  let state = 0;
  for (const char of seed) {
    state = (state * SEED_BASE + (char.codePointAt(0) ?? 0)) % LCG_MODULUS;
  }
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
}

/**
Demo bars for offline tests. Not used by the live Parallel path.
*/
export function fakeBarChart(
  topic: string,
  limit = DEMO_BARS.length,
  now = Date.UTC(2026, 9, 18, 12, 0)
): BarChartData {
  const query = topic.trim() || "demo comparison";
  const random = seeded(query.toLowerCase());
  const scale = 0.5 + random();
  return {
    asOf: now,
    bars: DEMO_BARS.slice(0, limit).map((bar) => ({
      name: bar.name,
      value: Math.round(bar.value * scale),
    })),
    fake: true,
    isPartsOfWhole: false,
    label: "Value",
    period: "2024",
    scale: "number",
    topic: query,
  };
}

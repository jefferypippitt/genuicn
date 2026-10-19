import { withRange } from "@/features/area-chart/area-chart-schema";
import type {
  AreaChartData,
  AreaChartPoint,
  AreaChartRange,
} from "@/features/area-chart/area-chart-schema";

const DEMO_POINTS: AreaChartPoint[] = [
  { value: 3_021_512_598, year: 1960 },
  { value: 3_680_493_750, year: 1970 },
  { value: 4_437_473_406, year: 1980 },
  { value: 5_298_962_018, year: 1990 },
  { value: 6_161_528_496, year: 2000 },
  { value: 7_000_860_073, year: 2010 },
  { value: 7_853_863_139, year: 2020 },
  { value: 8_140_897_523, year: 2024 },
];

/**
A linear congruential generator (Numerical Recipes' constants) seeded from a string, so a topic always gets the same demo series. Every product stays under 2^53, so plain arithmetic is exact.
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
Demo series for offline tests. Not used by the live World/Parallel path.
*/
export function fakeAreaChart(
  topic: string,
  range: AreaChartRange = "50y",
  now = Date.UTC(2026, 9, 17, 12, 0)
): AreaChartData {
  const query = topic.trim() || "demo series";
  const random = seeded(query.toLowerCase());
  const scale = 0.5 + random();
  const points = DEMO_POINTS.map((point) => ({
    value: Math.round(point.value * scale),
    year: point.year,
  }));
  const base: AreaChartData = {
    asOf: now,
    change: 0,
    changePercent: 0,
    fake: true,
    label: "Series",
    place: query,
    points,
    range: "max",
    scale: "number",
    topic: query,
    value: 0,
  };
  return withRange(base, range);
}

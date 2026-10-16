import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";

const STEPS: Record<QuoteRange, { count: number; every: number }> = {
  "1d": { count: 78, every: 5 * 60_000 },
  "1m": { count: 22, every: 86_400_000 },
  "1w": { count: 65, every: 30 * 60_000 },
  "1y": { count: 52, every: 7 * 86_400_000 },
};

function seeded(seed: string) {
  let state = 0;
  for (const char of seed) {
    state = Math.imul(state ^ (char.codePointAt(0) ?? 0), 2_654_435_761);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2_246_822_507);
    state = Math.imul(state ^ (state >>> 13), 3_266_489_909);
    return ((state ^= state >>> 16) >>> 0) / 4_294_967_296;
  };
}

export function fakeQuote(
  ticker: string,
  range: QuoteRange = "1d",
  now = Date.UTC(2026, 9, 14, 20, 0)
): QuoteData {
  const symbol = ticker.trim().toUpperCase();
  const random = seeded(`${symbol}:${range}`);
  const { count, every } = STEPS[range];

  let price = 50 + random() * 400;
  const points = Array.from({ length: count }, (_, index) => {
    price *= 1 + (random() - 0.5) * 0.02;
    return { price, time: now - (count - 1 - index) * every };
  });

  const first = points[0].price;
  const last = points.at(-1)?.price ?? first;
  return {
    asOf: now,
    change: last - first,
    changePercent: ((last - first) / first) * 100,
    currency: "USD",
    exchange: "Demo",
    fake: true,
    name: `${symbol} Inc.`,
    points,
    price: last,
    range,
    ticker: symbol,
  };
}

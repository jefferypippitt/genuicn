import "server-only";
import type {
  CryptoData,
  CryptoPoint,
  CryptoRange,
} from "@/features/crypto/crypto-schema";

// Server only: CoinGecko's free API allows only a few calls a minute per IP, so every card goes through these caches instead of calling it from the browser.

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

interface CoinGeckoChart {
  prices?: [number, number][];
}

interface KrakenOhlc {
  error: string[];
  result?: Record<string, unknown>;
}

const NOT_FOUND = 404;
const BUSY = 503;

/**
A lookup that failed for a reason the reader should hear about, with the HTTP status the route answers: 404 for an unknown coin, 503 while CoinGecko is rate-limiting.
*/
export class CryptoLookupError extends Error {
  readonly status: typeof NOT_FOUND | typeof BUSY;

  constructor(
    status: typeof NOT_FOUND | typeof BUSY,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "CryptoLookupError";
    this.status = status;
  }
}

const busy = () =>
  new CryptoLookupError(
    BUSY,
    "The crypto price service is busy. Try again in a minute."
  );

const CURRENCY = "USD";
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const DAY_POINTS = 25;
const TIMEOUT_MS = 8000;
const RATE_LIMITED = 429;
const KRAKEN_WEEK_MINUTES = 10_080;
const KRAKEN_CLOSE = 4;
const MAX_POINTS = 240;

/**
How long each answer stays fresh: the price for a minute, longer ranges for longer, since a year's line barely moves in an hour.
*/
const FRESH_MS = {
  all: 6 * 60 * MINUTE_MS,
  chart: 15 * MINUTE_MS,
  market: MINUTE_MS,
  week: 5 * MINUTE_MS,
} as const;

/**
CoinGecko's chart for each range, in days. "all" asks Kraken first: CoinGecko's free API only goes back a year.
*/
const CHART_DAYS = { "1m": 30, "1w": 7, "1y": 365, all: 365 } as const;

const cache = new Map<
  string,
  { savedAt: number; value?: unknown; pending?: Promise<unknown> }
>();

/**
Answers from the cache while it's fresh, shares a request already in flight, and falls back to the last good answer when the upstream is busy.
*/
function cached<T>(
  key: string,
  freshMs: number,
  load: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit?.pending) {
    return hit.pending as Promise<T>;
  }
  if (hit?.value !== undefined && Date.now() - hit.savedAt < freshMs) {
    return Promise.resolve(hit.value as T);
  }
  const pending = (async () => {
    try {
      const value = await load();
      cache.set(key, { savedAt: Date.now(), value });
      return value;
    } catch (error) {
      const isBusy =
        error instanceof CryptoLookupError && error.status === BUSY;
      if (isBusy && hit?.value !== undefined) {
        cache.set(key, { savedAt: hit.savedAt, value: hit.value });
        return hit.value as T;
      }
      cache.delete(key);
      throw error;
    }
  })();
  cache.set(key, { ...hit, pending, savedAt: hit?.savedAt ?? 0 });
  return pending;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === RATE_LIMITED) {
    throw busy();
  }
  if (!response.ok) {
    throw new Error(`The crypto price service returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

function getMarket(symbol: string) {
  return cached(`market:${symbol}`, FRESH_MS.market, async () => {
    const parameters = new URLSearchParams({
      include_tokens: "top",
      sparkline: "true",
      symbols: symbol.toLowerCase(),
      vs_currency: CURRENCY.toLowerCase(),
    });
    const [coin] = await fetchJson<CoinGeckoMarket[]>(
      `https://api.coingecko.com/api/v3/coins/markets?${parameters}`
    );
    if (!coin) {
      throw new CryptoLookupError(NOT_FOUND, `No coin found for "${symbol}".`);
    }
    return coin;
  });
}

/**
At most MAX_POINTS evenly spaced points, always keeping the first and the last, so a month of hourly prices draws and hovers as smoothly as a day.
*/
function thin(points: readonly CryptoPoint[]): CryptoPoint[] {
  if (points.length <= MAX_POINTS) {
    return [...points];
  }
  const step = (points.length - 1) / (MAX_POINTS - 1);
  return Array.from(
    { length: MAX_POINTS },
    (_, index) => points[Math.round(index * step)]
  );
}

/**
The last 24 hours of CoinGecko's hourly 7-day sparkline, timed back from the last update.
*/
function dayPoints(coin: CoinGeckoMarket, asOf: number): CryptoPoint[] {
  const day = (coin.sparkline_in_7d?.price ?? []).slice(-DAY_POINTS);
  return day.map((price, index) => ({
    price,
    time: asOf - (day.length - 1 - index) * HOUR_MS,
  }));
}

function coinGeckoChart(coin: CoinGeckoMarket, days: number) {
  return cached(
    `chart:${coin.id}:${days}`,
    days === CHART_DAYS["1w"] ? FRESH_MS.week : FRESH_MS.chart,
    async () => {
      const parameters = new URLSearchParams({
        days: String(days),
        vs_currency: CURRENCY.toLowerCase(),
      });
      const chart = await fetchJson<CoinGeckoChart>(
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin.id)}/market_chart?${parameters}`
      );
      return (chart.prices ?? []).map(([time, price]) => ({ price, time }));
    }
  );
}

/**
Every week since the coin listed on Kraken, or null when Kraken doesn't list it in US dollars.
*/
function krakenHistory(symbol: string) {
  return cached(`all:${symbol}`, FRESH_MS.all, async () => {
    const parameters = new URLSearchParams({
      interval: String(KRAKEN_WEEK_MINUTES),
      pair: symbol + CURRENCY,
    });
    const body = await fetchJson<KrakenOhlc>(
      `https://api.kraken.com/0/public/OHLC?${parameters}`
    );
    const series = Object.entries(body.result ?? {}).find(
      ([key]) => key !== "last"
    )?.[1];
    if (body.error.length > 0 || !Array.isArray(series)) {
      return null;
    }
    return (series as (string | number)[][]).map((candle) => ({
      price: Number(candle[KRAKEN_CLOSE]),
      time: Number(candle[0]) * 1000,
    }));
  });
}

async function rangePoints(
  coin: CoinGeckoMarket,
  symbol: string,
  range: Exclude<CryptoRange, "24h">
): Promise<CryptoPoint[]> {
  if (range === "all") {
    const history = await krakenHistory(symbol);
    if (history && history.length > 1) {
      return history;
    }
  }
  return coinGeckoChart(coin, CHART_DAYS[range]);
}

/**
The live price for a coin over a range. Pass the symbol normalized ("BTC"). The price, market cap and volume come from one cached CoinGecko call shared by every range; the trend line for 24 hours comes with it, longer ranges from CoinGecko's chart, and all time from Kraken.
*/
export async function getCrypto(
  symbol: string,
  range: CryptoRange = "24h"
): Promise<CryptoData> {
  const coin = await getMarket(symbol);
  const asOf = Date.parse(coin.last_updated) || Date.now();
  const price = coin.current_price;
  const history =
    range === "24h"
      ? dayPoints(coin, asOf)
      : await rangePoints(coin, symbol, range);
  const points = thin(history.filter((point) => point.time < asOf));
  points.push({ price, time: asOf });

  const first = points[0].price;
  const isDay = range === "24h";
  const change = isDay
    ? (coin.price_change_24h ?? price - first)
    : price - first;
  const dayPercent = isDay ? coin.price_change_percentage_24h : null;
  const changePercent = dayPercent ?? (change / (price - change || 1)) * 100;

  return {
    asOf,
    change,
    changePercent,
    currency: CURRENCY,
    image: coin.image,
    marketCap: coin.market_cap,
    name: coin.name,
    points,
    price,
    range,
    symbol: coin.symbol.toUpperCase(),
    volume24h: coin.total_volume,
  };
}

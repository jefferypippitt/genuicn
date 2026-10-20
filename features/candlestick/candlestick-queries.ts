import "server-only";
import type {
  Candle,
  CandlestickData,
  CandlestickRange,
} from "@/features/candlestick/candlestick-schema";

// Server only: the endpoint doesn't allow browser requests (CORS).

/**
Yahoo's span and candle size for each range, picked so every range draws 20 to 55 candles.
*/
const YAHOO_RANGE: Record<
  CandlestickRange,
  { range: string; interval: string; every: number }
> = {
  "1d": { every: 15 * 60_000, interval: "15m", range: "1d" },
  "1m": { every: 86_400_000, interval: "1d", range: "1mo" },
  "1w": { every: 60 * 60_000, interval: "1h", range: "5d" },
  "1y": { every: 7 * 86_400_000, interval: "1wk", range: "1y" },
  "6m": { every: 7 * 86_400_000, interval: "1wk", range: "6mo" },
};

const NOT_FOUND = 404;
const MS_PER_SECOND = 1000;

/**
Tidies the end of Yahoo's series. After the close it adds a flat candle with no trades (the closing print), which would draw as a stray dash; and on weekly candles it splits the current week in two, a bar for the week so far and a bar for today, which belong in one candle.
*/
function tidyEnd(candles: Candle[], every: number): Candle[] {
  const last = candles.at(-1);
  const before = candles.at(-2);
  if (!(last && before)) {
    return candles;
  }
  const isClosingPrint =
    last.volume === 0 && last.high === last.low && before.volume > 0;
  if (isClosingPrint) {
    return candles.slice(0, -1);
  }
  if (last.time - before.time < every) {
    const merged: Candle = {
      close: last.close,
      high: Math.max(before.high, last.high),
      low: Math.min(before.low, last.low),
      open: before.open,
      time: before.time,
      volume: before.volume + last.volume,
    };
    return [...candles.slice(0, -2), merged];
  }
  return candles;
}

type Series = (number | null)[];

interface YahooQuote {
  open?: Series;
  high?: Series;
  low?: Series;
  close?: Series;
  volume?: Series;
}

interface YahooChart {
  chart: {
    result:
      | {
          meta: {
            symbol: string;
            currency?: string;
            longName?: string;
            shortName?: string;
            fullExchangeName?: string;
            exchangeName?: string;
            exchangeTimezoneName?: string;
            regularMarketPrice: number;
            regularMarketTime: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
          timestamp?: number[];
          indicators: { quote: YahooQuote[] };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

export class CandlestickNotFoundError extends Error {
  constructor(ticker: string, options?: ErrorOptions) {
    super(`No candles found for "${ticker}".`, options);
    this.name = "CandlestickNotFoundError";
  }
}

/**
Pairs Yahoo's parallel arrays into candles, skipping the gaps Yahoo leaves where a candle has no trades yet.
*/
function candlesOf(
  timestamps: readonly number[],
  quote: YahooQuote | undefined
): Candle[] {
  const candles: Candle[] = [];
  for (const [index, time] of timestamps.entries()) {
    const open = quote?.open?.[index];
    const high = quote?.high?.[index];
    const low = quote?.low?.[index];
    const close = quote?.close?.[index];
    const isTraded =
      typeof open === "number" &&
      typeof high === "number" &&
      typeof low === "number" &&
      typeof close === "number";
    if (isTraded) {
      candles.push({
        close,
        high,
        low,
        open,
        time: time * MS_PER_SECOND,
        volume: quote?.volume?.[index] ?? 0,
      });
    }
  }
  return candles;
}

/**
The candles for a ticker over a range. Pass it normalized (trimmed, upper case).
*/
export async function getCandlestick(
  ticker: string,
  range: CandlestickRange = "1m"
): Promise<CandlestickData> {
  const { range: yahooRange, interval, every } = YAHOO_RANGE[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${yahooRange}&interval=${interval}`;

  const response = await fetch(url);
  if (response.status === NOT_FOUND) {
    throw new CandlestickNotFoundError(ticker);
  }
  if (!response.ok) {
    throw new Error(`The chart service returned ${response.status}.`);
  }

  const body = (await response.json()) as YahooChart;
  const result = body.chart.result?.[0];
  if (!result) {
    throw new CandlestickNotFoundError(ticker);
  }

  const { meta } = result;
  const candles = tidyEnd(
    candlesOf(result.timestamp ?? [], result.indicators.quote[0]),
    every
  );
  if (candles.length === 0) {
    throw new CandlestickNotFoundError(ticker);
  }

  const price = meta.regularMarketPrice;
  const base =
    range === "1d"
      ? (meta.chartPreviousClose ?? meta.previousClose ?? candles[0].open)
      : candles[0].open;
  const change = price - base;

  return {
    asOf: meta.regularMarketTime * MS_PER_SECOND,
    candles,
    change,
    changePercent: base ? (change / base) * 100 : 0,
    currency: meta.currency ?? "USD",
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    name: meta.longName ?? meta.shortName ?? meta.symbol,
    price,
    range,
    ticker: meta.symbol,
    timeZone: meta.exchangeTimezoneName ?? "America/New_York",
  };
}

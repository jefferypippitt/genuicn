import "server-only";
import type {
  QuoteData,
  QuotePoint,
  QuoteRange,
} from "@/features/quote/quote-schema";

// Server only: the endpoint doesn't allow browser requests (CORS).

const YAHOO_RANGE: Record<QuoteRange, { range: string; interval: string }> = {
  "1d": { interval: "5m", range: "1d" },
  "1m": { interval: "1d", range: "1mo" },
  "1w": { interval: "30m", range: "5d" },
  "1y": { interval: "1wk", range: "1y" },
};

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
            regularMarketPrice: number;
            regularMarketTime: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
          timestamp?: number[];
          indicators: { quote: { close: (number | null)[] }[] };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

export class QuoteNotFoundError extends Error {
  constructor(ticker: string, options?: ErrorOptions) {
    super(`No quote found for "${ticker}".`, options);
    this.name = "QuoteNotFoundError";
  }
}

/**
The live quote for a ticker. Pass it normalized (trimmed, upper case).
*/
export async function getQuote(
  ticker: string,
  range: QuoteRange = "1d"
): Promise<QuoteData> {
  const { range: yahooRange, interval } = YAHOO_RANGE[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${yahooRange}&interval=${interval}`;

  const response = await fetch(url);
  if (response.status === 404) {
    throw new QuoteNotFoundError(ticker);
  }
  if (!response.ok) {
    throw new Error(`The quote service returned ${response.status}.`);
  }

  const body = (await response.json()) as YahooChart;
  const result = body.chart.result?.[0];
  if (!result) {
    throw new QuoteNotFoundError(ticker);
  }

  const { meta } = result;
  const closes = result.indicators.quote[0]?.close ?? [];
  const points: QuotePoint[] = (result.timestamp ?? []).flatMap(
    (time, index) => {
      const price = closes[index];
      return price == null ? [] : [{ price, time: time * 1000 }];
    }
  );

  const price = meta.regularMarketPrice;
  const base =
    range === "1d"
      ? (meta.chartPreviousClose ?? meta.previousClose ?? points[0]?.price)
      : points[0]?.price;
  const change = base === undefined ? 0 : price - base;

  return {
    asOf: meta.regularMarketTime * 1000,
    change,
    changePercent: base ? (change / base) * 100 : 0,
    currency: meta.currency ?? "USD",
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    fake: false,
    name: meta.longName ?? meta.shortName ?? meta.symbol,
    points,
    price,
    range,
    ticker: meta.symbol,
  };
}

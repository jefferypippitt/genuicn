import { z } from "zod";

export const QUOTE_RANGES = ["1d", "1w", "1m", "1y"] as const;
export type QuoteRange = (typeof QUOTE_RANGES)[number];

export const RANGE_LABEL: Record<QuoteRange, string> = {
  "1d": "1D",
  "1m": "1M",
  "1w": "1W",
  "1y": "1Y",
};

/**
What the model sends: the tool's input.
*/
export const quoteInputSchema = z.object({
  range: z
    .enum(QUOTE_RANGES)
    .default("1d")
    .describe(
      "The time range for the trend line: 1d (today), 1w, 1m or 1y. Use 1d unless the user asks about a longer period."
    ),
  ticker: z
    .string()
    .min(1)
    .max(10)
    .describe(
      "The stock or ETF ticker symbol, for example NVDA or AAPL. Convert company names to their ticker."
    ),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

export interface QuotePoint {
  /**
  Unix time in milliseconds.
  */
  time: number;
  price: number;
}

export interface QuoteData {
  ticker: string;
  name: string;
  /**
  e.g. "USD".
  */
  currency: string;
  exchange: string;
  range: QuoteRange;
  price: number;
  /**
  Change over the range: against the previous close for 1d, against the first point otherwise.
  */
  change: number;
  changePercent: number;
  points: QuotePoint[];
  /**
  Unix time in milliseconds of the latest price.
  */
  asOf: number;
  /**
  True when this is generated data, not a live quote.
  */
  fake: boolean;
}

/**
The company's logo: a square tile from Parqet's public logo CDN, by ticker, no API key. A ticker without one answers 404, and the card falls back to a letter tile.
*/
export function quoteLogoUrl(ticker: string): string {
  return `https://assets.parqet.com/logos/symbol/${encodeURIComponent(ticker.toUpperCase())}?format=png`;
}

/** One sentence the model (or a screen reader) can use to describe the
 *  card. */
export function summarizeQuote(data: QuoteData): string {
  const price = formatPrice(data.price, data.currency);
  const direction = data.change >= 0 ? "up" : "down";
  const percent = `${Math.abs(data.changePercent).toFixed(2)}%`;
  const period =
    data.range === "1d"
      ? "today"
      : `over the past ${{ "1m": "month", "1w": "week", "1y": "year" }[data.range]}`;
  return `${data.name} (${data.ticker}) is at ${price}, ${direction} ${percent} ${period}.`;
}

export function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

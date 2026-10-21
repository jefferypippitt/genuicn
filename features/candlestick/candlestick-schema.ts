export const CANDLESTICK_RANGES = ["1d", "1w", "1m", "6m", "1y"] as const;
export type CandlestickRange = (typeof CANDLESTICK_RANGES)[number];

export const CANDLESTICK_RANGE_LABEL: Record<CandlestickRange, string> = {
  "1d": "1D",
  "1m": "1M",
  "1w": "1W",
  "1y": "1Y",
  "6m": "6M",
};

/**
How long each candle covers, for the card's footnote and the summary.
*/
export const CANDLE_SPAN: Record<CandlestickRange, string> = {
  "1d": "15-minute",
  "1m": "daily",
  "1w": "hourly",
  "1y": "weekly",
  "6m": "weekly",
};

const RANGE_PERIOD: Record<CandlestickRange, string> = {
  "1d": "today",
  "1m": "over the past month",
  "1w": "over the past week",
  "1y": "over the past year",
  "6m": "over the past six months",
};

export function isCandlestickRange(value: unknown): value is CandlestickRange {
  return (CANDLESTICK_RANGES as readonly unknown[]).includes(value);
}

export interface Candle {
  /**
  Unix time in milliseconds the candle opens at.
  */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /**
  Shares traded in the candle. Zero for an index, which has no volume.
  */
  volume: number;
}

export interface CandlestickData {
  ticker: string;
  name: string;
  /**
  e.g. "USD".
  */
  currency: string;
  exchange: string;
  /**
  The exchange's IANA time zone, e.g. "America/New_York". Candle times read in it.
  */
  timeZone: string;
  range: CandlestickRange;
  price: number;
  /**
  Change over the range: against the previous close for 1d, against the first candle's open otherwise.
  */
  change: number;
  changePercent: number;
  /**
  Oldest first.
  */
  candles: Candle[];
  /**
  Unix time in milliseconds of the latest price.
  */
  asOf: number;
}

const TICKER = /^[A-Z\d.^=-]{1,12}$/u;

/**
"nvda" and " NVDA " both read "NVDA". Null when it isn't a ticker.
*/
export function normalizeTicker(ticker: string): string | null {
  const trimmed = ticker.trim().toUpperCase();
  return TICKER.test(trimmed) ? trimmed : null;
}

/**
The message of a thrown error, or the fallback when something else was thrown. Uses instanceof rather than Error.isError, which Node 22 and older browsers don't have.
*/
export function errorMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError is missing on Node 22 and older browsers
  return error instanceof Error ? error.message : fallback;
}

/**
The open, high, low and volume across a run of candles: the first open, the highest high, the lowest low, the last close and every share traded.
*/
export function spanOf(candles: readonly Candle[]): Candle | null {
  const [first] = candles;
  const last = candles.at(-1);
  if (!(first && last)) {
    return null;
  }
  let { high, low } = first;
  let volume = 0;
  for (const candle of candles) {
    high = Math.max(high, candle.high);
    low = Math.min(low, candle.low);
    volume += candle.volume;
  }
  return {
    close: last.close,
    high,
    low,
    open: first.open,
    time: first.time,
    volume,
  };
}

export function formatPrice(value: number, currency: string): string {
  try {
    const format = new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    });
    return format.format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

const AXIS_PRICE = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/**
"247.30" for the price axis, where the currency sign would only crowd the labels.
*/
export function formatAxisPrice(value: number): string {
  return AXIS_PRICE.format(value);
}

/**
A time in the exchange's own zone, so a New York stock's first candle always reads 9:30 AM, and the server and the browser print the same thing.
*/
export function formatExchangeTime(
  time: number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  const format = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
  return format.format(time);
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeCandlestick(data: CandlestickData): string {
  const direction = data.change >= 0 ? "up" : "down";
  const percent = `${Math.abs(data.changePercent).toFixed(2)}%`;
  const span = spanOf(data.candles);
  const extremes = span
    ? ` It ranged from ${formatPrice(span.low, data.currency)} to ${formatPrice(span.high, data.currency)}.`
    : "";
  return `${data.name} (${data.ticker}) is at ${formatPrice(data.price, data.currency)}, ${direction} ${percent} ${RANGE_PERIOD[data.range]}, shown as ${data.candles.length} ${CANDLE_SPAN[data.range]} candles.${extremes}`;
}

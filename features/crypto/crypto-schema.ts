export const CRYPTO_RANGES = ["24h", "1w", "1m", "1y", "all"] as const;
export type CryptoRange = (typeof CRYPTO_RANGES)[number];

export const CRYPTO_RANGE_LABEL: Record<CryptoRange, string> = {
  "1m": "1M",
  "1w": "1W",
  "1y": "1Y",
  "24h": "24H",
  all: "All",
};

const RANGE_PERIOD: Record<CryptoRange, string> = {
  "1m": "the past month",
  "1w": "the past week",
  "1y": "the past year",
  "24h": "the past 24 hours",
  all: "all time",
};

export function isCryptoRange(value: unknown): value is CryptoRange {
  return (CRYPTO_RANGES as readonly unknown[]).includes(value);
}

export interface CryptoPoint {
  /**
  Unix time in milliseconds.
  */
  time: number;
  price: number;
}

export interface CryptoData {
  /**
  e.g. "BTC".
  */
  symbol: string;
  /**
  e.g. "Bitcoin".
  */
  name: string;
  /**
  The coin's logo, a square image from CoinGecko.
  */
  image: string;
  /**
  e.g. "USD".
  */
  currency: string;
  /**
  The span the trend line and the change cover.
  */
  range: CryptoRange;
  price: number;
  /**
  Change over the range, in the currency and as a percent.
  */
  change: number;
  changePercent: number;
  marketCap: number;
  /**
  Always the past 24 hours, whatever the range.
  */
  volume24h: number;
  /**
  Prices over the range, oldest first, ending at the current price.
  */
  points: CryptoPoint[];
  /**
  Unix time in milliseconds of the latest price.
  */
  asOf: number;
}

const SYMBOL = /^[A-Z\d]{1,10}$/u;

/**
"btc" and " BTC " both read "BTC". Null when it isn't a coin symbol.
*/
export function normalizeCryptoSymbol(symbol: string): string | null {
  const trimmed = symbol.trim().toUpperCase();
  return SYMBOL.test(trimmed) ? trimmed : null;
}

/**
The message of a thrown error, or the fallback when something else was thrown. Uses instanceof rather than Error.isError, which Node 22 and older browsers don't have.
*/
export function errorMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError is missing on Node 22 and older browsers
  return error instanceof Error ? error.message : fallback;
}

const SMALL_PRICE = 1;
const SMALL_PRICE_DIGITS = 4;

/**
"$82,076.00", and coins under a dollar keep enough digits to move: "$0.0001234".
*/
export function formatCryptoPrice(value: number, currency: string): string {
  const isSmall = Math.abs(value) < SMALL_PRICE && value !== 0;
  const format = new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
    ...(isSmall
      ? { maximumSignificantDigits: SMALL_PRICE_DIGITS }
      : { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
  });
  return format.format(value);
}

/**
"$1.65T", "$30.99B".
*/
export function formatCompactMoney(value: number, currency: string): string {
  const format = new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    notation: "compact",
    style: "currency",
  });
  return format.format(value);
}

const LARGE_PERCENT = 1000;

/**
"2.34%", and all-time gains read "66,011%" rather than "66011.47%".
*/
export function formatPercent(value: number): string {
  const size = Math.abs(value);
  const format = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: size >= LARGE_PERCENT ? 0 : 2,
    minimumFractionDigits: size >= LARGE_PERCENT ? 0 : 2,
  });
  return `${format.format(size)}%`;
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeCrypto(data: CryptoData): string {
  const direction = data.changePercent >= 0 ? "up" : "down";
  return `${data.name} (${data.symbol}) is at ${formatCryptoPrice(data.price, data.currency)}, ${direction} ${formatPercent(data.changePercent)} over ${RANGE_PERIOD[data.range]}. Market cap ${formatCompactMoney(data.marketCap, data.currency)}, 24-hour volume ${formatCompactMoney(data.volume24h, data.currency)}.`;
}

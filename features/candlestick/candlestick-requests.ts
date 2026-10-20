import { normalizeTicker } from "@/features/candlestick/candlestick-schema";
import type {
  CandlestickData,
  CandlestickRange,
} from "@/features/candlestick/candlestick-schema";

const sharedCandlestickRequests = new Map<
  string,
  { expiresAt: number; candles: Promise<CandlestickData> }
>();
const REUSE_MS = 60_000;

function candlestickKey(ticker: string, range: CandlestickRange) {
  return `${normalizeTicker(ticker) ?? ticker.trim().toUpperCase()}:${range}`;
}

async function fetchCandlestick(ticker: string, range: CandlestickRange) {
  const parameters = new URLSearchParams({ range, ticker });
  const response = await fetch(`/api/candlestick?${parameters}`);
  const body = (await response.json()) as CandlestickData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : `Chart request failed: ${response.status}`
    );
  }
  return body;
}

async function requestCandlestick(
  key: string,
  ticker: string,
  range: CandlestickRange
) {
  try {
    return await fetchCandlestick(ticker, range);
  } catch (error) {
    sharedCandlestickRequests.delete(key);
    throw error;
  }
}

export function loadCandlestick(
  ticker: string,
  range: CandlestickRange = "1m"
) {
  const key = candlestickKey(ticker, range);
  const hit = sharedCandlestickRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.candles;
  }
  const candles = requestCandlestick(key, ticker, range);
  sharedCandlestickRequests.set(key, {
    candles,
    expiresAt: Date.now() + REUSE_MS,
  });
  return candles;
}

export function primeCandlestick(
  ticker: string,
  range: CandlestickRange,
  data: CandlestickData
) {
  sharedCandlestickRequests.set(candlestickKey(ticker, range), {
    candles: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

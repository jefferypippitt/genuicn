import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";

const sharedQuoteRequests = new Map<
  string,
  { expiresAt: number; quote: Promise<QuoteData> }
>();
const REUSE_MS = 60_000;

function quoteKey(ticker: string, range: QuoteRange) {
  return `${ticker.toUpperCase()}:${range}`;
}

async function fetchQuote(ticker: string, range: QuoteRange) {
  const response = await fetch(
    `/api/quote?ticker=${encodeURIComponent(ticker)}&range=${range}`
  );
  const body = (await response.json()) as QuoteData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : `Quote request failed: ${response.status}`
    );
  }
  return body;
}

async function requestQuote(key: string, ticker: string, range: QuoteRange) {
  try {
    return await fetchQuote(ticker, range);
  } catch (error) {
    sharedQuoteRequests.delete(key);
    throw error;
  }
}

export function loadQuote(ticker: string, range: QuoteRange) {
  const key = quoteKey(ticker, range);
  const hit = sharedQuoteRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.quote;
  }
  const quote = requestQuote(key, ticker, range);
  sharedQuoteRequests.set(key, { expiresAt: Date.now() + REUSE_MS, quote });
  return quote;
}

export function primeQuote(ticker: string, range: QuoteRange, data: QuoteData) {
  sharedQuoteRequests.set(quoteKey(ticker, range), {
    expiresAt: Infinity,
    quote: Promise.resolve(data),
  });
}

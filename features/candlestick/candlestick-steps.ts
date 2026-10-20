import { listOf } from "@/features/chat/lookup";
import { loadCandlestick } from "@/features/candlestick/candlestick-requests";
import {
  isCandlestickRange,
  normalizeTicker,
} from "@/features/candlestick/candlestick-schema";
import type { CardLookup } from "@/features/chat/lookup";

function tickerOf(properties: Record<string, unknown>) {
  return typeof properties.ticker === "string" ? properties.ticker : "";
}

export const candlestickLookup: CardLookup = {
  intent: (tickers) =>
    tickers.length === 1
      ? `A candlestick chart for ${tickers[0]}`
      : `Candlestick charts for ${listOf(tickers)}`,
  load: (properties) =>
    loadCandlestick(
      tickerOf(properties),
      isCandlestickRange(properties.range) ? properties.range : "1m"
    ),
  sources: (properties) => {
    const ticker = normalizeTicker(tickerOf(properties)) ?? "";
    return [
      {
        href: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/chart`,
        label: `finance.yahoo.com/quote/${ticker}`,
      },
    ];
  },
  subject: (properties) => normalizeTicker(tickerOf(properties)),
};

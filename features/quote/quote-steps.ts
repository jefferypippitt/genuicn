import { loadQuote } from "@/features/quote/quote-requests";
import { listOf } from "@/features/chat/lookup";
import type { CardLookup } from "@/features/chat/lookup";
import type { QuoteRange } from "@/features/quote/quote-schema";

function propertiesOf(properties: Record<string, unknown>) {
  return {
    range: (properties.range ?? "1d") as QuoteRange,
    ticker: typeof properties.ticker === "string" ? properties.ticker : "",
  };
}

export const quoteLookup: CardLookup = {
  intent: (tickers) => {
    return tickers.length === 1
      ? `A stock quote for ${tickers[0]}`
      : `Stock quotes for ${listOf(tickers)}`;
  },
  load: (properties) => {
    const { ticker, range } = propertiesOf(properties);
    return loadQuote(ticker, range);
  },
  sources: (properties) => {
    const ticker = propertiesOf(properties).ticker.trim().toUpperCase();
    return [
      {
        href: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`,
        label: `finance.yahoo.com/quote/${ticker}`,
      },
    ];
  },
  subject: (properties) =>
    propertiesOf(properties).ticker.trim().toUpperCase() || null,
};

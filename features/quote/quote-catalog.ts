import { z } from "zod";
import { QUOTE_RANGES } from "@/features/quote/quote-schema";

export const quoteCatalogEntry = {
  description:
    "A live stock quote card: where a stock, ETF or company's shares stand right now, with the price, the change, a small trend line and a 1D/1W/1M/1Y switch. It fetches its own data. Use it for the everyday check-in: how a stock is doing, what it's trading at, whether it's up or down, how it has done over a week, month or year, and for checking several tickers at once. Convert company names to their ticker.",
  props: z.object({
    range: z
      .enum(QUOTE_RANGES)
      .nullable()
      .describe(
        "Trend line range: 1d (today), 1w, 1m or 1y. Null for today, unless the user asks about a longer period."
      ),
    ticker: z.string().describe("The ticker symbol, for example NVDA."),
  }),
};

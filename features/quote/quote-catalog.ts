import { z } from "zod";
import { QUOTE_RANGES } from "@/features/quote/quote-schema";

export const quoteCatalogEntry = {
  description:
    "A live stock quote card: current price, change, a small trend line and a 1D/1W/1M/1Y switch. It fetches its own data. Use it whenever the user asks how a stock, ETF or company's shares are doing. Convert company names to their ticker.",
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

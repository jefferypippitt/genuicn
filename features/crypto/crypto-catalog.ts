import { z } from "zod";
import { CRYPTO_RANGES } from "@/features/crypto/crypto-schema";

export const cryptoCatalogEntry = {
  description:
    "A live crypto price card: the coin's price, its change over the chosen range, market cap, 24-hour volume and a trend line with a 24H/1W/1M/1Y/All switch. It fetches its own data. Use it whenever the user asks about a cryptocurrency's price or how it's doing. Convert coin names to their symbol.",
  props: z.object({
    range: z
      .enum(CRYPTO_RANGES)
      .nullable()
      .describe(
        "Trend line range: 24h, 1w, 1m, 1y or all (since the coin listed). Null for the past 24 hours, unless the user asks about a longer period."
      ),
    symbol: z
      .string()
      .describe(
        'The coin\'s symbol, e.g. "BTC" for Bitcoin or "ETH" for Ethereum.'
      ),
  }),
};

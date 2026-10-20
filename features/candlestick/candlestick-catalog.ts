import { z } from "zod";
import { CANDLESTICK_RANGES } from "@/features/candlestick/candlestick-schema";

/**
People rarely say "candlestick". They ask how a stock moved, so the description routes on that: the path the price took, where QuoteCard shows where it stands. The words below are the everyday ways of asking about the path.
*/
export const candlestickCatalogEntry = {
  description:
    "A live candlestick chart for a stock, ETF or index: how its price moved, period by period. Each candle shows the open, high, low and close, with volume under it and a 1D/1W/1M/6M/1Y switch. It fetches its own data. Choose it over QuoteCard whenever the user asks how a stock moved rather than where it stands: how it traded, what happened to it, how it moved or swung, a drop, spike, rally, selloff or gap, its high, low or range, how volatile or choppy it was, its volume, support, resistance, a trend or breakout, whether now is a good entry or exit, or any request to see its chart. Words that point here: trade, traded, happened, moves, swings, choppy, volatile, range, high, low, volume, gap, support, resistance, trend, breakout, entry, exit, chart, technicals, price action. Where a stock is now (its price, whether it is up or down, its return over a period) stays with QuoteCard. Convert company names to their ticker.",
  props: z.object({
    range: z
      .enum(CANDLESTICK_RANGES)
      .nullable()
      .describe(
        "Chart range: 1d (15-minute candles today), 1w (hourly), 1m (daily), 6m or 1y (weekly). Match the period the user names: today or this morning is 1d, this week or last week is 1w, this month or lately is 1m. Null for the past month when no period is named."
      ),
    ticker: z.string().describe("The ticker symbol, for example NVDA."),
  }),
};

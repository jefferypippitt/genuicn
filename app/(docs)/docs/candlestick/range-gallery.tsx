"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import multiRun from "@/content/recordings/candlestick-multi.json";
import nvdaRun from "@/content/recordings/candlestick-nvda.json";
import { CandlestickCard } from "@/features/candlestick/components/candlestick-card";
import {
  CANDLESTICK_RANGE_LABEL,
  CANDLESTICK_RANGES,
} from "@/features/candlestick/candlestick-schema";
import type {
  CandlestickData,
  CandlestickRange,
} from "@/features/candlestick/candlestick-schema";

/**
Every range of the two tickers, as the playground's recordings saved them from Yahoo Finance: real candles, the same ones the card draws live.
*/
const SAVED: Record<string, unknown> = {
  ...nvdaRun.responsesByUrl,
  ...multiRun.responsesByUrl,
};

const TICKERS = ["NVDA", "AAPL"] as const;

const DEFAULT_RANGE = CANDLESTICK_RANGES.indexOf("1m");

function savedCandles(ticker: string, range: CandlestickRange) {
  const parameters = new URLSearchParams({ range, ticker });
  return SAVED[`/api/candlestick?${parameters}`] as CandlestickData;
}

export default function RangeGallery() {
  const [selected, setSelected] = useState(DEFAULT_RANGE);
  const range = CANDLESTICK_RANGES[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {CANDLESTICK_RANGES.map((option, index) => (
          <TabsSubtleItem
            key={option}
            index={index}
            label={CANDLESTICK_RANGE_LABEL[option]}
          />
        ))}
      </TabsSubtle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {TICKERS.map((ticker) => {
          const data = savedCandles(ticker, range);
          return (
            <figure key={ticker} className="flex flex-col gap-2">
              <CandlestickCard state="ready" data={data} />
              <figcaption className="text-muted-foreground">
                {data.name}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

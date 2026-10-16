"use client";

import { useEffect, useState } from "react";
import { QuoteCard } from "@/features/quote/components/quote-card";
import { loadQuote } from "@/features/quote/quote-requests";
import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";

type Load =
  | { status: "loading" }
  | { status: "ready"; data: QuoteData }
  | { status: "error"; message: string };

export const LiveQuoteCard = ({
  ticker,
  range = "1d",
  streaming = false,
}: {
  readonly ticker?: string;
  readonly range?: QuoteRange;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
}) => {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (streaming || !ticker) {
      return;
    }
    let isCancelled = false;
    setLoad({ status: "loading" });
    const run = async () => {
      try {
        const data = await loadQuote(ticker, range);
        if (!isCancelled) {
          setLoad({ data, status: "ready" });
        }
      } catch (error) {
        if (!isCancelled) {
          setLoad({
            message: Error.isError(error) ? error.message : "Quote failed.",
            status: "error",
          });
        }
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [ticker, range, streaming]);

  if (streaming || !ticker) {
    return <QuoteCard state="streaming" ticker={ticker} />;
  }
  if (load.status === "ready") {
    return <QuoteCard state="ready" data={load.data} loadRange={loadQuote} />;
  }
  return load.status === "error" ? (
    <QuoteCard state="error" ticker={ticker} error={load.message} />
  ) : (
    <QuoteCard state="loading" ticker={ticker} />
  );
};

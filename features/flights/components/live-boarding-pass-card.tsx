"use client";

import { useEffect, useState } from "react";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import { loadBoardingPass } from "@/features/flights/flight-requests";
import { errorMessage } from "@/features/flights/flight-schema";
import type { BoardingPassVariant } from "@/features/flights/components/boarding-pass-card";
import type { BoardingPassData } from "@/features/flights/flight-schema";

type Load =
  | { status: "loading" }
  | { status: "ready"; data: BoardingPassData }
  | { status: "error"; message: string };

export function LiveBoardingPassCard({
  flight,
  date,
  streaming = false,
  variant = "map",
  className,
}: {
  readonly flight?: string;
  /**
  YYYY-MM-DD. Null or left out: today.
  */
  readonly date?: string | null;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  /**
  "map" (the default) or "brand", the airline's color. See BoardingPassCard.
  */
  readonly variant?: BoardingPassVariant;
  readonly className?: string;
}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (streaming || !flight) {
      return;
    }
    let isCancelled = false;
    setLoad({ status: "loading" });
    const run = async () => {
      try {
        const data = await loadBoardingPass(flight, date);
        if (!isCancelled) {
          setLoad({ data, status: "ready" });
        }
      } catch (error) {
        if (!isCancelled) {
          setLoad({
            message: errorMessage(error, "Flight lookup failed."),
            status: "error",
          });
        }
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [flight, date, streaming]);

  if (streaming || !flight) {
    return (
      <BoardingPassCard
        state="streaming"
        flight={flight}
        className={className}
      />
    );
  }
  if (load.status === "ready") {
    return (
      <BoardingPassCard
        state="ready"
        data={load.data}
        variant={variant}
        className={className}
      />
    );
  }
  if (load.status === "error") {
    return (
      <BoardingPassCard
        state="error"
        flight={flight}
        error={load.message}
        className={className}
      />
    );
  }
  return (
    <BoardingPassCard state="loading" flight={flight} className={className} />
  );
}

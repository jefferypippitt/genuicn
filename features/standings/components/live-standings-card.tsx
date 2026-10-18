"use client";

import { useEffect, useState } from "react";
import StandingsCard from "@/features/standings/components/standings-card";
import { loadStandings } from "@/features/standings/standings-requests";
import {
  errorMessage,
  parseConference,
} from "@/features/standings/standings-schema";
import type { StandingsData } from "@/features/standings/standings-schema";

/**
What came back for one conference. A result for the other conference reads as still loading, so the card never flashes the wrong table.
*/
type Result =
  | { key: string; status: "ready"; data: StandingsData }
  | { key: string; status: "error"; message: string };

export default function LiveStandingsCard({
  conference: requested,
  streaming = false,
  className,
}: {
  /**
  "east" or "west"; anything else waits.
  */
  readonly conference?: string;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const conference = requested ? parseConference(requested) : null;

  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!conference) {
        return;
      }
      let next: Result;
      try {
        next = {
          data: await loadStandings(conference),
          key: conference,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: conference,
          message: errorMessage(error, "Standings lookup failed."),
          status: "error",
        };
      }
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming) {
      run();
    }
    return () => {
      isCancelled = true;
    };
  }, [conference, streaming]);

  if (streaming || !conference) {
    return (
      <StandingsCard
        state="streaming"
        conference={conference ?? undefined}
        className={className}
      />
    );
  }
  const current = result?.key === conference ? result : null;
  if (current?.status === "ready") {
    return (
      <StandingsCard state="ready" data={current.data} className={className} />
    );
  }
  if (current?.status === "error") {
    return (
      <StandingsCard
        state="error"
        conference={conference}
        error={current.message}
        className={className}
      />
    );
  }
  return (
    <StandingsCard
      state="loading"
      conference={conference}
      className={className}
    />
  );
}

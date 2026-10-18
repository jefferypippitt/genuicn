"use client";

import { useEffect, useState } from "react";
import WinProbabilityCard from "@/features/win-probability/components/win-probability-card";
import {
  isPrimedWinProbability,
  loadWinProbability,
} from "@/features/win-probability/win-probability-requests";
import { errorMessage } from "@/features/win-probability/win-probability-schema";
import type { WinProbabilityData } from "@/features/win-probability/win-probability-schema";

/**
How often a game in progress reads its chances again.
*/
const POLL_MS = 30_000;

function nextPoll(count: number) {
  return count + 1;
}

/**
What came back for one set of props. A result for different props reads as still loading, so a new game never flashes the old one. A recording's chances are saved, so it never polls.
*/
type Result =
  | {
      key: string;
      status: "ready";
      data: WinProbabilityData;
      isSaved: boolean;
    }
  | { key: string; status: "error"; message: string };

export default function LiveWinProbabilityCard({
  team,
  date = null,
  streaming = false,
  className,
}: {
  readonly team?: string;
  readonly date?: string | null;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [poll, setPoll] = useState(0);
  const key = `${team}:${date}`;

  useEffect(() => {
    let isCancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const run = async (name: string) => {
      let next: Result;
      try {
        next = {
          data: await loadWinProbability({ date, team: name }),
          isSaved: isPrimedWinProbability({ date, team: name }),
          key,
          status: "ready",
        };
      } catch (error) {
        next = {
          key,
          message: errorMessage(error, "Win probability lookup failed."),
          status: "error",
        };
      }
      if (isCancelled) {
        return;
      }
      setResult(next);
      const isLive =
        next.status === "ready" && next.data.state === "in" && !next.isSaved;
      if (isLive) {
        pollTimer = setTimeout(() => setPoll(nextPoll), POLL_MS);
      }
    };
    if (!streaming && team) {
      run(team);
    }
    return () => {
      isCancelled = true;
      clearTimeout(pollTimer);
    };
  }, [team, date, key, streaming, poll]);

  if (streaming || !team) {
    return (
      <WinProbabilityCard state="streaming" team={team} className={className} />
    );
  }
  const current = result?.key === key ? result : null;
  if (current?.status === "ready") {
    return (
      <WinProbabilityCard
        state="ready"
        data={current.data}
        className={className}
      />
    );
  }
  if (current?.status === "error") {
    return (
      <WinProbabilityCard
        state="error"
        team={team}
        error={current.message}
        className={className}
      />
    );
  }
  return (
    <WinProbabilityCard state="loading" team={team} className={className} />
  );
}

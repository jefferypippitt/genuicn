"use client";

import { useEffect, useState } from "react";
import ScoreboardCard from "@/features/scoreboard/components/scoreboard-card";
import {
  isPrimedScoreboard,
  loadScoreboard,
} from "@/features/scoreboard/scoreboard-requests";
import { errorMessage } from "@/features/scoreboard/scoreboard-schema";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";

const POLL_MS = 30_000;

function nextPoll(count: number) {
  return count + 1;
}

type Result =
  | { key: string; status: "ready"; data: ScoreboardData; isSaved: boolean }
  | { key: string; status: "error"; message: string };

export default function LiveScoreboardCard({
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
          data: await loadScoreboard({ date, team: name }),
          isSaved: isPrimedScoreboard({ date, team: name }),
          key,
          status: "ready",
        };
      } catch (error) {
        next = {
          key,
          message: errorMessage(error, "Score lookup failed."),
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
      <ScoreboardCard state="streaming" team={team} className={className} />
    );
  }
  const current = result?.key === key ? result : null;
  if (current?.status === "ready") {
    return (
      <ScoreboardCard state="ready" data={current.data} className={className} />
    );
  }
  if (current?.status === "error") {
    return (
      <ScoreboardCard
        state="error"
        team={team}
        error={current.message}
        className={className}
      />
    );
  }
  return <ScoreboardCard state="loading" team={team} className={className} />;
}

"use client";

import { useEffect, useState } from "react";
import PlayerCard from "@/features/player/components/player-card";
import { loadPlayer } from "@/features/player/player-requests";
import { errorMessage, normalizeName } from "@/features/player/player-schema";
import type { PlayerData } from "@/features/player/player-schema";

type Result =
  | {
      key: string;
      status: "ready";
      data: PlayerData[];
      missing: string[];
    }
  | { key: string; status: "error"; message: string };

function namesOf(players: readonly string[] | undefined) {
  const names = (players ?? []).flatMap((name) => {
    const normalized = normalizeName(name);
    return normalized ? [normalized] : [];
  });
  return [...new Set(names)];
}

export default function LivePlayerCard({
  players: requested,
  streaming = false,
  className,
}: {
  readonly players?: readonly string[];
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const names = namesOf(requested);
  const key = names.join("|");

  useEffect(() => {
    let isCancelled = false;
    const run = async (list: readonly string[]) => {
      const settled = await Promise.allSettled(
        list.map((name) => loadPlayer(name))
      );
      const data = settled.flatMap((outcome) =>
        outcome.status === "fulfilled" ? [outcome.value] : []
      );
      const missing = list.filter(
        (_, index) => settled[index]?.status === "rejected"
      );
      const [firstFailure] = settled.flatMap((outcome) =>
        outcome.status === "rejected" ? [outcome.reason] : []
      );
      const next: Result =
        data.length > 0
          ? { data, key, missing, status: "ready" }
          : {
              key,
              message: errorMessage(firstFailure, "Player lookup failed."),
              status: "error",
            };
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming && key) {
      run(key.split("|"));
    }
    return () => {
      isCancelled = true;
    };
  }, [key, streaming]);

  if (streaming || names.length === 0) {
    return (
      <PlayerCard state="streaming" players={names} className={className} />
    );
  }
  const current = result?.key === key ? result : null;
  if (current?.status === "ready") {
    return (
      <PlayerCard
        state="ready"
        data={current.data}
        missing={current.missing}
        className={className}
      />
    );
  }
  if (current?.status === "error") {
    return (
      <PlayerCard
        state="error"
        players={names}
        error={current.message}
        className={className}
      />
    );
  }
  return <PlayerCard state="loading" players={names} className={className} />;
}

"use client";

import { useEffect, useState } from "react";
import NbaCupCard from "@/features/nba-cup/components/nba-cup-card";
import { loadCupGroup } from "@/features/nba-cup/nba-cup-requests";
import { errorMessage, parseCupGroup } from "@/features/nba-cup/nba-cup-schema";
import type { CupGroupData } from "@/features/nba-cup/nba-cup-schema";

/**
What came back for one group. A result for another group reads as still loading, so the card never flashes the wrong table.
*/
type Result =
  | { key: string; status: "ready"; data: CupGroupData }
  | { key: string; status: "error"; message: string };

export default function LiveNbaCupCard({
  group: requested,
  streaming = false,
  className,
}: {
  /**
  e.g. "west-a"; anything else waits.
  */
  readonly group?: string;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const group = requested ? parseCupGroup(requested) : null;

  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!group) {
        return;
      }
      let next: Result;
      try {
        next = { data: await loadCupGroup(group), key: group, status: "ready" };
      } catch (error) {
        next = {
          key: group,
          message: errorMessage(error, "NBA Cup lookup failed."),
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
  }, [group, streaming]);

  if (streaming || !group) {
    return (
      <NbaCupCard
        state="streaming"
        group={group ?? undefined}
        className={className}
      />
    );
  }
  const current = result?.key === group ? result : null;
  if (current?.status === "ready") {
    return (
      <NbaCupCard state="ready" data={current.data} className={className} />
    );
  }
  if (current?.status === "error") {
    return (
      <NbaCupCard
        state="error"
        group={group}
        error={current.message}
        className={className}
      />
    );
  }
  return <NbaCupCard state="loading" group={group} className={className} />;
}

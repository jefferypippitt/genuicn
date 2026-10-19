"use client";

import { useEffect, useRef, useState } from "react";
import {
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from "@/components/ui/thinking-steps";
import { lookups } from "@/features/chat/chat-steps";
import { listOf } from "@/features/chat/lookup";
import { spring } from "@/lib/springs";
import { hostOf } from "@/lib/url-host";
import type { CardLookup, Source } from "@/features/chat/lookup";
import type { Spec } from "@json-render/core";
import type { IconName } from "@/lib/icon-context";
import type { ReactNode } from "react";

const DONE_HOLD_MS = 600;
const READ_BEAT_MS = 400;
const FOLD_MS = Math.round(spring.moderate.duration * 1000);

type Load =
  | { status: "loading" }
  | { status: "ready"; sources: readonly Source[] }
  | { status: "error"; message: string };

interface Card {
  key: string;
  subject: string;
  lookup: CardLookup;
  props: Record<string, unknown>;
}

interface Step {
  key: string;
  icon: IconName;
  label: string;
  done: boolean;
  children?: ReactNode;
}

type StepStatus = "complete" | "active" | "pending";

/**
The reply's web searches, for the search step.
*/
export interface WebSearchProgress {
  readonly queries: readonly string[];
  readonly isDone: boolean;
  readonly sources: readonly { id: string; title: string; url: string }[];
}

function cardsIn(spec: Spec | null): Card[] {
  const cards: Card[] = [];
  const elements = Object.values(spec?.elements ?? {});
  for (const element of elements) {
    const lookup = lookups[element.type];
    const properties = (element.props ?? {}) as Record<string, unknown>;
    const subject = lookup?.subject(properties);
    if (lookup && subject) {
      cards.push({
        key: `${element.type}:${subject}`,
        lookup,
        props: properties,
        subject,
      });
    }
  }
  return cards;
}

function areSameCards(left: readonly Card[], right: readonly Card[]): boolean {
  return (
    left.length === right.length &&
    left.every((card, index) => card.key === right[index]?.key)
  );
}

function useLoads(cards: readonly Card[], isReady: boolean) {
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [plan, setPlan] = useState({ cards, isReady });
  if (plan.isReady !== isReady || !areSameCards(plan.cards, cards)) {
    setPlan({ cards, isReady });
  }

  useEffect(() => {
    let isCancelled = false;
    const toLoad = plan.isReady ? plan.cards : [];
    for (const card of toLoad) {
      const settle = (load: Load) => {
        if (!isCancelled) {
          setLoads((current) => ({ ...current, [card.key]: load }));
        }
      };
      card.lookup
        .load(card.props)
        .then((result) =>
          settle({
            sources: card.lookup.resultSources?.(result) ?? [],
            status: "ready",
          })
        )
        .catch((error: unknown) =>
          settle({
            message: Error.isError(error) ? error.message : "It failed.",
            status: "error",
          })
        );
    }
    return () => {
      isCancelled = true;
    };
  }, [plan]);

  return loads;
}

/**
Whether the read beat has passed: a short hold once the sources are in, so "Read N sources" lands as its own step instead of flashing by. Disarming resets it.
*/
function useHasReadBeatElapsed(isArmed: boolean): boolean {
  const [hasElapsed, setHasElapsed] = useState(false);
  if (!isArmed && hasElapsed) {
    setHasElapsed(false);
  }
  useEffect(() => {
    const beat = setTimeout(() => {
      if (isArmed) {
        setHasElapsed(true);
      }
    }, READ_BEAT_MS);
    return () => clearTimeout(beat);
  }, [isArmed]);
  return hasElapsed;
}

function uniqueHosts(sources: readonly Source[]): Source[] {
  const byHost = new Map<string, Source>();
  for (const source of sources) {
    const host = hostOf(source.href) || source.label;
    if (!byHost.has(host)) {
      byHost.set(host, { href: source.href, label: host });
    }
  }
  return [...byHost.values()];
}

function pickSources(
  researched: readonly Source[],
  fromSearch: readonly Source[],
  cards: readonly Card[]
): Source[] {
  if (researched.length > 0) {
    return [...researched];
  }
  return fromSearch.length > 0
    ? [...fromSearch]
    : uniqueHosts(cards.flatMap((card) => card.lookup.sources(card.props)));
}

function sourceLabel(count: number, verb: "Read" | "Explored"): string {
  const noun = count === 1 ? "source" : "sources";
  return `${verb} ${count} ${noun}`;
}

function buildSteps({
  isResearching,
  isSearched,
  isRead,
  isDone,
  cards,
  sources,
}: {
  isResearching: boolean;
  isSearched: boolean;
  isRead: boolean;
  isDone: boolean;
  cards: readonly Card[];
  sources: readonly Source[];
}): Step[] {
  if (!isResearching) {
    if (!isDone) {
      return [];
    }
    return [
      {
        done: true,
        icon: "check",
        key: "done",
        label: "Done",
      },
    ];
  }

  return [
    {
      done: isSearched,
      icon: "search",
      key: "search",
      label:
        cards.length > 0
          ? `Looking up ${listOf(cards.map((card) => card.subject))}`
          : "Searched the web",
    },
    {
      children:
        isRead && sources.length > 0 ? (
          <ThinkingStepDetails
            summary={sourceLabel(sources.length, "Explored")}
            details={sources.map((source) => `Read ${source.label}`)}
          />
        ) : undefined,
      done: isRead,
      icon: "globe",
      key: "read",
      label:
        sources.length > 0
          ? sourceLabel(sources.length, "Read")
          : "Reading sources",
    },
    {
      done: isDone,
      icon: "check",
      key: "done",
      label: "Done",
    },
  ];
}

function stepStatus(active: number, index: number): StepStatus {
  if (active === -1 || index < active) {
    return "complete";
  }
  return index === active ? "active" : "pending";
}

/**
Basic ThinkingSteps: Searched → Read N sources → Done.
Card stays last — onFinish runs only after Done.
*/
export function ReplySteps({
  spec,
  hasText,
  search = null,
  streaming,
  onFinish,
}: {
  readonly spec: Spec | null;
  readonly hasText: boolean;
  readonly search?: WebSearchProgress | null;
  readonly streaming: boolean;
  readonly onFinish: () => void;
}) {
  const cards = cardsIn(spec);
  const loads = useLoads(cards, !streaming);
  const [open, setOpen] = useState(true);
  const [startedAt] = useState(() => performance.now());
  /**
  Seconds from the first render to Done, set when the steps fold; null until then.
  */
  const [foldedAfter, setFoldedAfter] = useState<number | null>(null);

  const isStarted = hasText || spec !== null || search !== null;
  const isWritten = isStarted && !streaming;
  const isFetched = cards.every((card) => {
    const load = loads[card.key];
    return load && load.status !== "loading";
  });
  const isSearched =
    (search ? search.isDone : true) && (cards.length === 0 || isFetched);
  const isResearching = Boolean(search) || cards.length > 0;
  const canMarkRead = isStarted && isSearched;
  const hasBeatElapsed = useHasReadBeatElapsed(canMarkRead && isResearching);

  const isRead = canMarkRead && (!isResearching || hasBeatElapsed);
  const isDone = isWritten && isSearched && isRead;

  const onFinishReference = useRef(onFinish);
  onFinishReference.current = onFinish;
  useEffect(() => {
    // Read once Done lands, so the hold before the fold isn't counted.
    const doneAt = performance.now();
    const fold = setTimeout(() => {
      if (!isDone) {
        return;
      }
      setFoldedAfter((doneAt - startedAt) / 1000);
      setOpen(false);
    }, DONE_HOLD_MS);
    const finish = setTimeout(() => {
      if (isDone) {
        onFinishReference.current();
      }
    }, DONE_HOLD_MS + FOLD_MS);
    return () => {
      clearTimeout(fold);
      clearTimeout(finish);
    };
  }, [isDone, startedAt]);

  if (!isStarted) {
    return null;
  }

  const researched = uniqueHosts(
    cards.flatMap((card) => {
      const load = loads[card.key];
      return load?.status === "ready" ? load.sources : [];
    })
  );
  const fromSearch = search
    ? uniqueHosts(
        search.sources.map(({ url }) => ({
          href: url,
          label: hostOf(url),
        }))
      )
    : [];
  const sources = pickSources(researched, fromSearch, cards);
  const steps = buildSteps({
    cards,
    isDone,
    isRead,
    isResearching,
    isSearched,
    sources,
  });
  const active = steps.findIndex((step) => !step.done);
  const lastShown = active === -1 ? steps.length - 1 : active;

  return (
    <ThinkingSteps open={open} onOpenChange={setOpen}>
      <ThinkingStepsHeader>
        {foldedAfter === null
          ? "Thinking"
          : `Worked for ${foldedAfter.toFixed(1)}s`}
      </ThinkingStepsHeader>
      {steps.length > 0 ? (
        <ThinkingStepsContent>
          {steps.map((step, index) => {
            const status = stepStatus(active, index);
            return (
              <ThinkingStep
                key={step.key}
                icon={step.icon}
                label={step.label}
                status={status}
                isLast={index === lastShown}
              >
                {status === "complete" ? step.children : undefined}
              </ThinkingStep>
            );
          })}
        </ThinkingStepsContent>
      ) : null}
    </ThinkingSteps>
  );
}

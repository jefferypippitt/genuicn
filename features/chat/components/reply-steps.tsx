"use client";

import { useEffect, useRef, useState } from "react";
import {
  ThinkingStep,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from "@/components/ui/thinking-steps";
import { lookups } from "@/features/chat/chat-steps";
import { listOf } from "@/features/chat/lookup";
import { spring } from "@/lib/springs";
import type { CardLookup, Source } from "@/features/chat/lookup";
import type { Spec } from "@json-render/core";
import type { IconName } from "@/lib/icon-context";
import type { ReactNode } from "react";

const DONE_HOLD_MS = 600;

const FOLD_MS = Math.round(spring.moderate.duration * 1000);

type Load =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

interface Card {
  key: string;
  type: string;
  subject: string;
  lookup: CardLookup;
  props: Record<string, unknown>;
}

type StepStatus = "complete" | "active" | "pending";

interface Step {
  key: string;
  icon: IconName;
  label: string;
  description?: string;
  done: boolean;
  children?: ReactNode;
}

function cardsIn(spec: Spec | null): Card[] {
  const cards: Card[] = [];
  for (const element of Object.values(spec?.elements ?? {})) {
    const lookup = lookups[element.type];
    const properties = (element.props ?? {}) as Record<string, unknown>;
    const subject = lookup?.subject(properties);
    if (lookup && subject) {
      cards.push({
        key: `${element.type}:${subject}`,
        lookup,
        props: properties,
        subject,
        type: element.type,
      });
    }
  }
  return cards;
}

function hasSameKeys(left: readonly Card[], right: readonly Card[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (const [index, element] of left.entries()) {
    if (element?.key !== right[index]?.key) {
      return false;
    }
  }
  return true;
}

interface LoadPlan {
  readonly isReady: boolean;
  readonly cards: readonly Card[];
}

function useLoadPlan(cards: readonly Card[], isReady: boolean): LoadPlan {
  const [plan, setPlan] = useState<LoadPlan>({ cards, isReady });
  if (plan.isReady === isReady && hasSameKeys(plan.cards, cards)) {
    return plan;
  }
  const next = { cards, isReady };
  setPlan(next);
  return next;
}

function useLoads(cards: readonly Card[], ready: boolean) {
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const plan = useLoadPlan(cards, ready);

  useEffect(() => {
    if (!plan.isReady) {
      return;
    }
    let isCancelled = false;
    for (const card of plan.cards) {
      const settle = (load: Load) => {
        if (!isCancelled) {
          setLoads((current) => ({ ...current, [card.key]: load }));
        }
      };
      card.lookup
        .load(card.props)
        .catch((error: unknown) =>
          settle({
            message: Error.isError(error) ? error.message : "It failed.",
            status: "error",
          })
        )
        .then(() => settle({ status: "ready" }));
    }
    return () => {
      isCancelled = true;
    };
  }, [plan]);

  return loads;
}

function useElapsed(isDone: boolean) {
  const [startedAt] = useState(() => performance.now());
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (isDone) {
      setSeconds((performance.now() - startedAt) / 1000);
    }
  }, [isDone, startedAt]);
  return seconds;
}

function SourceLink({ source }: { readonly source: Source }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${source.label} (opens in a new tab)`}
      className="outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] hover:underline hover:underline-offset-2 focus-visible:after:ring-1 focus-visible:after:ring-[color:var(--focus-ring,#6B97FF)]"
    >
      {source.label}
    </a>
  );
}

function intentOf(cards: readonly Card[]) {
  const byKind = new Map<CardLookup, string[]>();
  for (const card of cards) {
    byKind.set(card.lookup, [...(byKind.get(card.lookup) ?? []), card.subject]);
  }
  return [...byKind]
    .map(([lookup, subjects]) => lookup.intent(subjects))
    .join("; ");
}

export function ReplySteps({
  spec,
  hasText,
  streaming,
  onFinish,
}: {
  readonly spec: Spec | null;
  readonly hasText: boolean;
  /**
  The model is still writing this reply.
  */
  readonly streaming: boolean;
  /**
  The steps are done and folded: time to show the answer.
  */
  readonly onFinish: () => void;
}) {
  const cards = cardsIn(spec);
  const loads = useLoads(cards, !streaming);
  const [open, setOpen] = useState(true);

  const isStarted = hasText || spec !== null;
  const isWritten = isStarted && !streaming;
  const isFetched = cards.every((card) => {
    const load = loads[card.key];
    return load && load.status !== "loading";
  });
  const isDone = isWritten && isFetched;
  const seconds = useElapsed(isDone);

  const [isFolded, setIsFolded] = useState(false);
  const onFinishReference = useRef(onFinish);
  onFinishReference.current = onFinish;
  useEffect(() => {
    if (!isDone) {
      return;
    }
    const fold = setTimeout(() => {
      setIsFolded(true);
      setOpen(false);
    }, DONE_HOLD_MS);
    const finish = setTimeout(
      () => onFinishReference.current(),
      DONE_HOLD_MS + FOLD_MS
    );
    return () => {
      clearTimeout(fold);
      clearTimeout(finish);
    };
  }, [isDone]);

  const failures = cards.flatMap((card) => {
    const load = loads[card.key];
    return load?.status === "error" ? [`${card.subject}: ${load.message}`] : [];
  });
  const sources = [
    ...new Map(
      cards
        .flatMap((card) => card.lookup.sources(card.props))
        .map((source) => [source.href, source])
    ).values(),
  ];

  const steps: Step[] = [
    {
      description: isWritten && cards.length > 0 ? intentOf(cards) : undefined,
      done: spec ? isWritten : isStarted,
      icon: "message-circle",
      key: "understand",
      label: "Understanding the question",
    },
  ];
  if (isStarted && !spec) {
    steps.push({
      done: isWritten,
      icon: "pencil",
      key: "write",
      label: "Writing an answer",
    });
  }
  if (cards.length > 0) {
    steps.push({
      children: (
        <ThinkingStepSources>
          {sources.map((source, index) => (
            <ThinkingStepSource
              key={source.href}
              delay={0.05 * (index + 1)}
              className="relative"
            >
              <SourceLink source={source} />
            </ThinkingStepSource>
          ))}
        </ThinkingStepSources>
      ),
      description: failures.length > 0 ? failures.join(" ") : undefined,
      done: isFetched,
      icon: "search",
      key: "lookup",
      label: `Looking up ${listOf(cards.map((card) => card.subject))}`,
    });
  }
  steps.push({
    description:
      seconds === null ? undefined : `Took ${seconds.toFixed(1)} seconds.`,
    done: isDone,
    icon: "check",
    key: "done",
    label: "Done",
  });

  const active = steps.findIndex((step) => !step.done);
  const lastShown = active === -1 ? steps.length - 1 : active;
  const statusAt = (index: number): StepStatus => {
    if (active === -1 || index < active) {
      return "complete";
    }
    return index === active ? "active" : "pending";
  };

  const header =
    isFolded && seconds !== null
      ? `Worked for ${seconds.toFixed(1)}s`
      : "Thinking";

  return (
    <ThinkingSteps open={open} onOpenChange={setOpen}>
      <ThinkingStepsHeader>{header}</ThinkingStepsHeader>
      <ThinkingStepsContent>
        {steps.map((step, index) => {
          const status = statusAt(index);
          return (
            <ThinkingStep
              key={step.key}
              icon={step.icon}
              label={step.label}
              description={step.description}
              status={status}
              isLast={index === lastShown}
            >
              {status === "complete" ? step.children : undefined}
            </ThinkingStep>
          );
        })}
      </ThinkingStepsContent>
    </ThinkingSteps>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { CHART_THEMES } from "@/lib/chart-themes";
import { cn } from "@/lib/utils";
import {
  formatRadialValue,
  radialCeiling,
  summarizeRadialChart,
} from "@/features/radial-chart/radial-chart-schema";
import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";

export type RadialChartCardState = "streaming" | "loading" | "ready" | "error";

export interface RadialChartCardProperties {
  readonly state: RadialChartCardState;
  /**
  The topic from the tool input, shown before the data arrives.
  */
  readonly topic?: string;
  readonly data?: RadialChartData;
  readonly error?: string;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md`;

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
The rings in chart units: the outermost ring's radius, each ring's thickness, and how far in the next one sits.
*/
const VIEW = 200;
const CENTER = VIEW / 2;
const OUTER_RADIUS = 86;
const RING = 11;
const RING_STEP = 16;
/**
A full ring runs three quarters of the way round, from twelve o'clock to nine, leaving the top-left quarter for the labels.
*/
const SWEEP = 75;
const HATCH_GAP = 3.5;

/**
With this many rings or fewer, the hole in the middle is big enough for the headline.
*/
const MAX_RINGS_WITH_CENTER = 3;

/**
How long each ring takes to draw, and how long it waits after the one outside it, so they wind up outside in.
*/
const DRAW_MS = 1000;
const RING_STAGGER_MS = 110;

/**
False for the first frame, so the rings start empty and their dash transition winds them up.
*/
function useIsDrawn() {
  const [isDrawn, setIsDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isDrawn;
}

function radiusOf(index: number) {
  return OUTER_RADIUS - index * RING_STEP;
}

/**
This card's colors: rose. Every chart card has its own, so a reply with several charts tells them apart at a glance.
*/
const THEME = CHART_THEMES.radial;

const Rings = ({ data }: { readonly data: RadialChartData }) => {
  const hatchId = useId();
  const isDrawn = useIsDrawn();
  const [active, setActive] = useState<number | null>(null);
  const ceiling = radialCeiling(data);
  const focusIndex = active ?? 0;
  const focus = data.rings[focusIndex];
  const hasCenter = data.rings.length <= MAX_RINGS_WITH_CENTER;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="size-full -rotate-90 overflow-visible"
      >
        <defs>
          {/* A pattern takes its color from where it is defined, not from the
              ring that uses it, so it carries the theme itself. */}
          <pattern
            id={hatchId}
            className={THEME.soft}
            width={HATCH_GAP}
            height={HATCH_GAP}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={HATCH_GAP}
              stroke="currentColor"
              strokeWidth={1.25}
            />
          </pattern>
        </defs>
        {data.rings.map((ring, index) => {
          const radius = radiusOf(index);
          const length = (Math.min(ring.value, ceiling) / ceiling) * SWEEP;
          const isLead = index === 0;
          const isActive = active === index;
          const isSolid = isLead || isActive;
          return (
            <g
              key={ring.name}
              className={cn(
                "transition-opacity duration-200",
                isLead ? THEME.solid : THEME.soft,
                active !== null && !isActive && "opacity-30"
              )}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={radius}
                fill="none"
                pathLength={100}
                className="stroke-muted"
                strokeWidth={RING}
                strokeDasharray={`${SWEEP} 100`}
                strokeLinecap="round"
              />
              {ring.value > 0 ? (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={radius}
                  fill="none"
                  pathLength={100}
                  stroke={isSolid ? "currentColor" : `url(#${hatchId})`}
                  strokeWidth={RING}
                  strokeDasharray={`${isDrawn ? length : 0} 100`}
                  strokeLinecap="round"
                  className="transition-[stroke-dasharray] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                  style={{
                    transitionDelay: `${index * RING_STAGGER_MS}ms`,
                    transitionDuration: `${DRAW_MS}ms`,
                  }}
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Each ring's name and value sit in the open quarter, ending just
          short of where the ring starts. */}
      <ol className="pointer-events-none absolute inset-0">
        {data.rings.map((ring, index) => (
          <li
            key={ring.name}
            className={cn(
              "absolute flex h-4 -translate-y-1/2 items-center justify-end gap-1.5 text-xs leading-4 transition-opacity duration-200",
              active !== null && active !== index && "opacity-30"
            )}
            style={{
              right: `${((CENTER + 8) / VIEW) * 100}%`,
              top: `${((CENTER - radiusOf(index)) / VIEW) * 100}%`,
            }}
          >
            <span
              className={cn(
                "max-w-20 truncate",
                index === 0 ? "font-semibold" : "text-muted-foreground"
              )}
            >
              {ring.name}
            </span>
            <span className="font-mono font-medium tabular-nums">
              {formatRadialValue(ring.value, data.scale)}
            </span>
          </li>
        ))}
      </ol>

      {hasCenter && focus ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <p className="font-mono text-2xl leading-8 font-semibold tracking-tighter tabular-nums">
            {formatRadialValue(focus.value, data.scale)}
          </p>
          <p className="text-muted-foreground max-w-24 truncate text-xs">
            {focus.name}
          </p>
        </div>
      ) : null}
    </div>
  );
};

/**
"of 500K" when a full ring is a target rather than the obvious 100%, so the reader knows what full means.
*/
function fullMark(data: RadialChartData) {
  const isObvious =
    data.max === null || (data.scale === "percent" && data.max === 100);
  return isObvious
    ? null
    : `of ${formatRadialValue(radialCeiling(data), data.scale)}`;
}

const RadialChartReady = ({ data }: { readonly data: RadialChartData }) => {
  const mark = fullMark(data);
  return (
    <div className="flex flex-col gap-3">
      <header className="flex h-5 min-w-0 items-center">
        <p className="truncate text-sm font-semibold">
          {titleCase(data.topic)}
        </p>
      </header>

      <div className="py-1">
        <Rings data={data} />
      </div>

      <footer className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 truncate text-xs">
          {data.label}
          {mark ? (
            <>
              {" "}
              <span className="font-mono tabular-nums">{mark}</span>
            </>
          ) : null}
          {data.period ? (
            <>
              {" · "}
              <span className="tabular-nums">{data.period}</span>
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
};

const RadialChartError = ({
  topic,
  message = "The figures service didn't respond. Try again in a moment.",
}: {
  readonly topic?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {topic
        ? `Couldn't load the figures for ${titleCase(topic)}`
        : "Couldn't load the radial chart"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

const SKELETON_RINGS = 4;

/**
The card while its data is on the way: empty tracks the size of the ready rings, so the card holds its place while the figures are found. Shows the topic as soon as it's known (with "…" while the model is still writing it).
*/
export const RadialChartCardSkeleton = ({
  topic,
  streaming = false,
  className,
}: {
  readonly topic?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "flex flex-col gap-3", className)}>
    <span className="sr-only">
      {topic ? `Loading the figures for ${topic}` : "Loading a radial chart"}
    </span>
    <div aria-hidden className="flex h-5 items-center">
      {topic ? (
        <p className="truncate text-sm font-semibold">
          {titleCase(topic)}
          {streaming ? <span className="text-muted-foreground">…</span> : null}
        </p>
      ) : (
        <div className="bg-muted h-3.5 w-24 animate-pulse rounded" />
      )}
    </div>
    <div aria-hidden className="py-1">
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="mx-auto aspect-square w-full max-w-64 -rotate-90 animate-pulse"
      >
        {Array.from({ length: SKELETON_RINGS }, (_, index) => (
          <circle
            // The tracks are identical placeholders with nothing else to key on.
            key={index}
            cx={CENTER}
            cy={CENTER}
            r={radiusOf(index)}
            fill="none"
            pathLength={100}
            className="stroke-muted"
            strokeWidth={RING}
            strokeDasharray={`${SWEEP} 100`}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
    <div aria-hidden className="flex h-4 items-center">
      <div className="bg-muted h-3 w-28 animate-pulse rounded" />
    </div>
  </output>
);

export const RadialChartCard = ({
  state,
  topic,
  data,
  error,
  className,
}: RadialChartCardProperties) => {
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <RadialChartError topic={topic} message={error} />
      </div>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <RadialChartCardSkeleton
        topic={topic}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  return (
    <section
      aria-label={summarizeRadialChart(data)}
      className={cn(CARD_FRAME, className)}
    >
      <RadialChartReady data={data} />
    </section>
  );
};

"use client";

import { useEffect, useId, useState } from "react";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { CHART_THEMES } from "@/lib/chart-themes";
import { cn } from "@/lib/utils";
import {
  OTHER_LABEL,
  formatPieValue,
  formatShare,
  pieTotal,
  sliceShare,
  summarizePieChart,
} from "@/features/pie-chart/pie-chart-schema";
import type {
  PieChartData,
  PieSlice,
} from "@/features/pie-chart/pie-chart-schema";

export type PieChartCardState = "streaming" | "loading" | "ready" | "error";

export interface PieChartCardProperties {
  readonly state: PieChartCardState;
  /**
  The topic from the tool input, shown before the data arrives.
  */
  readonly topic?: string;
  readonly data?: PieChartData;
  readonly error?: string;
  /**
  Shows when the figures were looked up. Turn it off for saved data, where the time is the save date, not the reader's now.
  */
  readonly showAsOf?: boolean;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md`;

const AS_OF_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  // Fixed, so the server render and the browser agree on the date.
  timeZone: "UTC",
  year: "numeric",
});

function formatAsOf(time: number) {
  return AS_OF_FORMAT.format(time);
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
This card's colors: the violet ramp, biggest slice strongest, so the eye reads the order before the labels. Every chart card has its own, so a reply with several charts tells them apart at a glance. "Other" is hatched in grey, since it's leftovers rather than a part of its own.
*/
const SLICE_TONES = CHART_THEMES.pie.ramp;
const OTHER_TONE = "text-muted-foreground";

function isOther(slice: PieSlice) {
  return slice.label === OTHER_LABEL;
}

function sliceTone(slice: PieSlice, index: number) {
  return isOther(slice)
    ? OTHER_TONE
    : SLICE_TONES[Math.min(index, SLICE_TONES.length - 1)];
}

const SWATCH_HATCH =
  "bg-[image:repeating-linear-gradient(-45deg,currentColor_0_1px,transparent_1px_3px)]";

/**
The donut in chart units: every slice runs round a circle of this radius, its stroke as thick as the ring.
*/
const VIEW = 100;
const RADIUS = 38;
const RING = 16;
/**
How much the hovered slice's ring thickens, so it lifts out of the donut.
*/
const RING_LIFT = 4;
/**
The background-colored gap cut between slices, in percent of the circle.
*/
const SLICE_GAP = 0.6;
const HATCH_GAP = 3;

/**
How long the donut takes to sweep round once, start to finish. Each slice draws for its share of it, after the slices before it, so it reads as one clockwise stroke.
*/
const SWEEP_MS = 900;

/**
False for the first frame, so the slices start empty and their dash transition sweeps them in.
*/
function useIsDrawn() {
  const [isDrawn, setIsDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isDrawn;
}

interface Arc {
  slice: PieSlice;
  index: number;
  start: number;
  length: number;
}

function arcsOf(slices: readonly PieSlice[], total: number): Arc[] {
  let start = 0;
  return slices.map((slice, index) => {
    const length = sliceShare(slice, total) * 100;
    const arc = { index, length, slice, start };
    start += length;
    return arc;
  });
}

const Donut = ({
  data,
  active,
  onActive,
}: {
  readonly data: PieChartData;
  readonly active: number | null;
  readonly onActive: (index: number | null) => void;
}) => {
  const hatchId = useId();
  const isDrawn = useIsDrawn();
  const total = pieTotal(data);
  const arcs = arcsOf(data.slices, total);
  const center = VIEW / 2;
  const focus = active === null ? null : data.slices[active];
  const [top] = data.slices;
  // Shares already add up to 100%, so the middle leads with the biggest
  // slice instead of a total that says nothing.
  const restingValue = data.scale === "percent" ? top.value : total;
  const restingLabel = data.scale === "percent" ? top.label : "total";

  return (
    <div className="relative size-36 shrink-0">
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="size-full -rotate-90 overflow-visible"
      >
        <defs>
          <pattern
            id={hatchId}
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
              strokeWidth={1}
            />
          </pattern>
        </defs>
        {arcs.map(({ slice, index, start, length }) => {
          const visible = Math.max(length - SLICE_GAP, 0.1);
          const isActive = active === index;
          return (
            <circle
              key={slice.label}
              cx={center}
              cy={center}
              r={RADIUS}
              fill="none"
              pathLength={100}
              stroke={isOther(slice) ? `url(#${hatchId})` : "currentColor"}
              strokeWidth={isActive ? RING + RING_LIFT : RING}
              strokeDasharray={`${isDrawn ? visible : 0} 100`}
              strokeDashoffset={-start}
              className={cn(
                "cursor-default transition-[stroke-dasharray,stroke-width,opacity] ease-linear motion-reduce:transition-none",
                sliceTone(slice, index),
                active !== null && !isActive && "opacity-35"
              )}
              style={{
                transitionDelay: `${(start / 100) * SWEEP_MS}ms, 0ms, 0ms`,
                transitionDuration: `${(length / 100) * SWEEP_MS}ms, 200ms, 200ms`,
              }}
              onMouseEnter={() => onActive(index)}
              onMouseLeave={() => onActive(null)}
            />
          );
        })}
      </svg>

      {/* The middle names the whole, or the slice under the pointer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
      >
        <p className="font-mono text-xl leading-7 font-semibold tracking-tighter tabular-nums">
          {focus
            ? formatShare(sliceShare(focus, total))
            : formatPieValue(restingValue, data.scale)}
        </p>
        <p className="text-muted-foreground line-clamp-2 max-w-full text-xs leading-4 break-words">
          {focus?.label ?? restingLabel}
        </p>
      </div>
    </div>
  );
};

const Legend = ({
  data,
  active,
  onActive,
}: {
  readonly data: PieChartData;
  readonly active: number | null;
  readonly onActive: (index: number | null) => void;
}) => {
  const total = pieTotal(data);
  return (
    <ol className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_2.25rem] content-center gap-x-2 @sm:w-auto @sm:flex-1">
      {data.slices.map((slice, index) => {
        const isActive = active === index;
        return (
          <li
            key={slice.label}
            className="col-span-full grid grid-cols-subgrid"
          >
            <button
              type="button"
              className={cn(
                "focus-visible:ring-ring col-span-full -mx-1.5 grid min-h-6 cursor-default grid-cols-subgrid items-center rounded-sm px-1.5 py-1 text-left text-xs leading-4 transition-[opacity,background-color] duration-200 outline-none focus-visible:ring-2",
                isActive && "bg-muted/70",
                active !== null && !isActive && "opacity-40"
              )}
              onMouseEnter={() => onActive(index)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(index)}
              onBlur={() => onActive(null)}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-[2px]",
                  sliceTone(slice, index),
                  isOther(slice) ? SWATCH_HATCH : "bg-current"
                )}
              />
              <span
                className={cn(
                  "text-pretty break-words",
                  index === 0 && "font-semibold"
                )}
              >
                {slice.label}
              </span>
              <span className="text-muted-foreground text-right font-mono tabular-nums">
                {formatPieValue(slice.value, data.scale)}
              </span>
              <span
                className={cn(
                  "text-right font-mono font-medium tabular-nums",
                  index === 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {formatShare(sliceShare(slice, total))}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

const PieChartReady = ({
  data,
  showAsOf,
}: {
  readonly data: PieChartData;
  readonly showAsOf: boolean;
}) => {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="@container flex flex-col gap-3">
      <header className="flex h-5 min-w-0 items-center">
        <p className="truncate text-sm font-semibold">
          {titleCase(data.topic)}
        </p>
      </header>

      {/* Side by side when the card has room; on a phone the donut sits
          above the legend, so the names get the whole width. */}
      <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-5">
        <Donut data={data} active={active} onActive={setActive} />
        <Legend data={data} active={active} onActive={setActive} />
      </div>

      <footer className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 truncate text-xs">
          {data.label}
          {data.period ? (
            <>
              {" · "}
              <span className="tabular-nums">{data.period}</span>
            </>
          ) : null}
        </p>
        {showAsOf ? (
          <p className="text-muted-foreground shrink-0 text-xs">
            As of {formatAsOf(data.asOf)}
          </p>
        ) : null}
      </footer>
    </div>
  );
};

const PieChartError = ({
  topic,
  message = "The figures service didn't respond. Try again in a moment.",
}: {
  readonly topic?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {topic
        ? `Couldn't load a breakdown of ${titleCase(topic)}`
        : "Couldn't load the pie chart"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

const SKELETON_ROWS = 5;

/**
The card while its data is on the way: the same donut and legend as the ready card, so nothing moves when the figures land. Shows the topic as soon as it's known (with "…" while the model is still writing it).
*/
export const PieChartCardSkeleton = ({
  topic,
  streaming = false,
  className,
}: {
  readonly topic?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output
    className={cn(CARD_FRAME, "@container flex flex-col gap-3", className)}
  >
    <span className="sr-only">
      {topic ? `Loading a breakdown of ${topic}` : "Loading a pie chart"}
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
    <div
      aria-hidden
      className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-5"
    >
      <div className="flex size-36 shrink-0 items-center justify-center">
        <div className="border-muted size-[7.5rem] animate-pulse rounded-full border-[1.4rem]" />
      </div>
      <div className="flex w-full min-w-0 flex-col @sm:w-auto @sm:flex-1">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          // The rows are identical placeholders with nothing else to key on.
          <div key={index} className="flex h-6 items-center gap-2">
            <div className="bg-muted size-2.5 animate-pulse rounded-[2px]" />
            <div className="bg-muted h-3 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-3 w-8 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
    <div aria-hidden className="flex h-4 items-center">
      <div className="bg-muted h-3 w-28 animate-pulse rounded" />
    </div>
  </output>
);

export const PieChartCard = ({
  state,
  topic,
  data,
  error,
  showAsOf = true,
  className,
}: PieChartCardProperties) => {
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <PieChartError topic={topic} message={error} />
      </div>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <PieChartCardSkeleton
        topic={topic}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  return (
    <section
      aria-label={summarizePieChart(data)}
      className={cn(CARD_FRAME, className)}
    >
      <PieChartReady data={data} showAsOf={showAsOf} />
    </section>
  );
};

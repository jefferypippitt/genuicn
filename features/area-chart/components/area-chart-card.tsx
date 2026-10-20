"use client";

import { useId, useState } from "react";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { CHART_THEMES } from "@/lib/chart-themes";
import { cn } from "@/lib/utils";
import {
  AREA_CHART_RANGES,
  RANGE_LABEL,
  formatChange,
  formatSeriesValue,
  isAreaChartRange,
  isRangeDistinct,
  periodTotal,
  summarizeAreaChart,
  withRange,
  withSubject,
} from "@/features/area-chart/area-chart-schema";
import type {
  AreaChartData,
  AreaChartRange,
} from "@/features/area-chart/area-chart-schema";

export type AreaChartCardState = "streaming" | "loading" | "ready" | "error";

export interface AreaChartCardProperties {
  readonly state: AreaChartCardState;
  /**
  The topic from the tool input, shown before the data arrives.
  */
  readonly topic?: string;
  readonly data?: AreaChartData;
  readonly error?: string;
  /**
  The full (Max) series behind `data`. When given, the 10Y/25Y/50Y/Max switch shows and filters it in place, with no second search. Without it, the switch is hidden and the card shows the range it was given.
  */
  readonly series?: AreaChartData;
  /**
  Shows when the series was taken. Turn it off for saved data, where the time is the save date, not the reader's now.
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

/**
The plot's drawing box; the SVG stretches it to the card's width.
*/
const PLOT_WIDTH = 300;
const PLOT_HEIGHT = 96;
/**
How close to either edge, in percent, the hover label stops centering on the point and hugs that edge instead.
*/
const LABEL_EDGE_PERCENT = 20;

function formatAsOf(time: number) {
  return AS_OF_FORMAT.format(time);
}

function labelAlignFor(xPercent: number) {
  if (xPercent < LABEL_EDGE_PERCENT) {
    return "translate-x-0";
  }
  return xPercent > 100 - LABEL_EDGE_PERCENT
    ? "-translate-x-full"
    : "-translate-x-1/2";
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function shownData(
  data: AreaChartData | undefined,
  series: AreaChartData | undefined,
  selectedRange: AreaChartRange | null,
  selectedSubject: string | null
): AreaChartData | undefined {
  const subject = data?.subjects?.find((item) => item.name === selectedSubject);
  if (data && subject) {
    return withSubject(data, subject);
  }
  return series && selectedRange ? withRange(series, selectedRange) : data;
}

function hasSubjectTabs(data: AreaChartData): boolean {
  return (data.subjects?.length ?? 0) >= 2;
}

interface Tabs {
  readonly label: string;
  readonly items: readonly {
    readonly id: string;
    readonly label: string;
    readonly isDisabled: boolean;
  }[];
  readonly selectedId: string;
}

function tabsFor(
  shown: AreaChartData,
  series: AreaChartData | undefined
): Tabs | undefined {
  if (shown.subjects && hasSubjectTabs(shown)) {
    return {
      items: shown.subjects.map(({ name }) => ({
        id: name,
        isDisabled: false,
        label: name,
      })),
      label: "Subject",
      selectedId: shown.place,
    };
  }
  if (!series) {
    return undefined;
  }
  return {
    items: AREA_CHART_RANGES.map((range) => ({
      id: range,
      isDisabled:
        range !== shown.range && !isRangeDistinct(series.points, range),
      label: RANGE_LABEL[range],
    })),
    label: "Range",
    selectedId: shown.range,
  };
}

/**
This card's colors: indigo. Every chart card has its own, so a reply with several charts tells them apart at a glance.
*/
const THEME = CHART_THEMES.area;

/**
Faint rules at each quarter of the plot's height, the same print-chart grid the bar chart draws.
*/
const GRIDLINES =
  "bg-[image:repeating-linear-gradient(to_bottom,var(--border)_0_1px,transparent_1px_25%)]";

/**
Spacing of the diagonal hatching under the line, in plot units.
*/
const HATCH_GAP = 4;

const AreaPlot = ({
  data,
  className,
}: {
  readonly data: AreaChartData;
  readonly className?: string;
}) => {
  const fillId = useId();
  const hatchId = useId();
  const fadeId = useId();
  const [active, setActive] = useState<number | null>(null);
  const width = PLOT_WIDTH;
  const height = PLOT_HEIGHT;
  const { points } = data;
  if (points.length < 2) {
    return <div className="h-28" />;
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 2 - ((value - min) / span) * (height - 4),
  ]);
  const line = coords
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    )
    .join(" ");

  const last = points.length - 1;
  const indexAt = (clientX: number, box: DOMRect) =>
    Math.round(
      Math.min(Math.max((clientX - box.left) / box.width, 0), 1) * last
    );

  const point = active === null ? null : points[active];
  const xPercent = active === null ? 0 : (active / last) * 100;
  const labelAlign = labelAlignFor(xPercent);

  const scrubbed = point ?? points[last];
  const marker = active ?? last;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <div
      className={cn(
        "has-[input:focus-visible]:ring-ring border-foreground/25 relative h-28 w-full border-b has-[input:focus-visible]:ring-2",
        GRIDLINES,
        className
      )}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden
        className="size-full"
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
              strokeWidth={1.25}
            />
          </pattern>
          <linearGradient id={fadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.7} />
            <stop offset="100%" stopColor="white" stopOpacity={0.1} />
          </linearGradient>
          <mask id={fillId}>
            <rect width={width} height={height} fill={`url(#${fadeId})`} />
          </mask>
        </defs>
        <g mask={`url(#${fillId})`}>
          <path d={area} fill="currentColor" fillOpacity={0.12} />
          <path d={area} fill={`url(#${hatchId})`} />
        </g>
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* A card-colored sheet that slides off to the right, so the series
          draws in left to right; keyed so a new range or subject redraws. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
      >
        <div
          key={`${data.place}-${data.range}`}
          className="bg-background animate-out slide-out-to-right-full fill-mode-forwards size-full duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </div>

      {point ? (
        <div
          aria-hidden
          className="border-foreground/40 pointer-events-none absolute inset-y-0 border-l border-dashed"
          style={{ left: `${xPercent}%` }}
        />
      ) : null}
      <div
        aria-hidden
        className="ring-background pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2"
        style={{
          left: `${(marker / last) * 100}%`,
          top: `${(coords[marker][1] / height) * 100}%`,
        }}
      />
      {point ? (
        <div
          aria-hidden
          className={cn(
            "bg-popover text-popover-foreground pointer-events-none absolute -top-1 rounded-sm border px-2 py-1 text-xs whitespace-nowrap shadow-sm",
            labelAlign
          )}
          style={{ left: `${xPercent}%` }}
        >
          <span className="font-mono font-semibold tabular-nums">
            {formatSeriesValue(point.value, data.scale, false)}
          </span>
          <span className="text-muted-foreground ml-2 font-mono tabular-nums">
            {point.year}
          </span>
        </div>
      ) : null}

      {/* A native range under the pointer and the keyboard: arrows, Home and
          End step through the years, and screen readers announce each one. */}
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={active ?? last}
        aria-label={summarizeAreaChart(data)}
        aria-valuetext={`${formatSeriesValue(scrubbed.value, data.scale, false)} in ${scrubbed.year}`}
        onChange={(event) => setActive(Number(event.currentTarget.value))}
        onPointerMove={(event) =>
          setActive(
            indexAt(event.clientX, event.currentTarget.getBoundingClientRect())
          )
        }
        onPointerDown={(event) =>
          setActive(
            indexAt(event.clientX, event.currentTarget.getBoundingClientRect())
          )
        }
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? last)}
        onBlur={() => setActive(null)}
        className="absolute inset-0 size-full cursor-crosshair touch-pan-y appearance-none opacity-0"
      />
    </div>
  );
};

const AreaChartReady = ({
  data,
  showAsOf,
  tabs,
  onSelectTab,
}: {
  readonly data: AreaChartData;
  readonly showAsOf: boolean;
  readonly tabs?: Tabs;
  readonly onSelectTab: (id: string) => void;
}) => {
  const isUp = data.change >= 0;
  const sign = isUp ? "+" : "−";
  const changeTone = isUp
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  const firstYear = data.points[0]?.year;
  const lastYear = data.points.at(-1)?.year;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex h-5 min-w-0 items-center">
        <p className="truncate text-sm font-semibold">
          {titleCase(data.topic)}
        </p>
      </header>

      {data.isPeriodTotal ? (
        <div className="flex h-9 items-baseline gap-2.5">
          <p className="font-mono text-3xl font-semibold tracking-tighter tabular-nums">
            {formatSeriesValue(periodTotal(data), data.scale)}
          </p>
          <p className="text-muted-foreground text-sm">total</p>
        </div>
      ) : (
        <div className="flex h-9 items-baseline gap-2.5">
          <p className="font-mono text-3xl font-semibold tracking-tighter tabular-nums">
            {formatSeriesValue(data.value, data.scale)}
          </p>
          <p
            className={cn(
              "flex items-center gap-1 font-mono text-sm font-medium tabular-nums",
              changeTone
            )}
          >
            <span aria-hidden className="text-xs">
              {isUp ? "▲" : "▼"}
            </span>
            {sign}
            {formatChange(data)}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <AreaPlot data={data} className={THEME.solid} />
        <div
          aria-hidden
          className="text-muted-foreground flex h-4 items-center justify-between font-mono text-xs tabular-nums"
        >
          <span>{firstYear}</span>
          <span>{lastYear}</span>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2",
          tabs ? "justify-between" : "justify-end",
          !(tabs || (showAsOf && !data.subjects)) && "hidden"
        )}
      >
        {tabs ? (
          <fieldset className="bg-muted flex min-w-0 gap-0.5 overflow-x-auto rounded-lg p-0.5">
            <legend className="sr-only">{tabs.label}</legend>
            {tabs.items.map((item) => {
              const isSelected = item.id === tabs.selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={item.isDisabled}
                  onClick={() => onSelectTab(item.id)}
                  className={cn(
                    "focus-visible:ring-ring shrink-0 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40",
                    isSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </fieldset>
        ) : null}
        {showAsOf && !data.subjects ? (
          <p className="text-muted-foreground shrink-0 text-xs">
            As of {formatAsOf(data.asOf)}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const AreaChartError = ({
  topic,
  message = "The series service didn't respond. Try again in a moment.",
}: {
  readonly topic?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {topic
        ? `Couldn't load a chart for ${titleCase(topic)}`
        : "Couldn't load the area chart"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

/** The card while its data is on the way: the same frame and rows as the
 *  ready card, so nothing moves when the series lands. Shows the topic as
 *  soon as it's known (with "…" while the model is still writing it). */
export const AreaChartCardSkeleton = ({
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
      {topic ? `Loading a chart for ${topic}` : "Loading an area chart"}
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
    <div aria-hidden className="flex h-9 items-center">
      <div className="bg-muted h-8 w-40 animate-pulse rounded" />
    </div>
    <div aria-hidden className="flex flex-col gap-1.5">
      <div
        className={cn(
          "border-foreground/10 h-28 w-full animate-pulse border-b",
          GRIDLINES
        )}
      />
      <div className="h-4" />
    </div>
    <div aria-hidden className="bg-muted h-6 w-44 animate-pulse rounded-lg" />
  </output>
);

export const AreaChartCard = ({
  state,
  topic,
  data,
  error,
  series,
  showAsOf = true,
  className,
}: AreaChartCardProperties) => {
  const [selectedRange, setSelectedRange] = useState<AreaChartRange | null>(
    null
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const shown = shownData(data, series, selectedRange, selectedSubject);

  if (!(state === "error" || (state === "ready" && shown))) {
    return (
      <AreaChartCardSkeleton
        topic={topic}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  if (state === "error" || !shown) {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <AreaChartError topic={topic} message={error} />
      </div>
    );
  }
  return (
    <section
      aria-label={summarizeAreaChart(shown)}
      className={cn(CARD_FRAME, className)}
    >
      <AreaChartReady
        data={shown}
        showAsOf={showAsOf}
        tabs={tabsFor(shown, series)}
        onSelectTab={(id) => {
          if (hasSubjectTabs(shown)) {
            setSelectedSubject(id);
          } else if (isAreaChartRange(id)) {
            setSelectedRange(id);
          }
        }}
      />
    </section>
  );
};

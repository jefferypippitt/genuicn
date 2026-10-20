"use client";

import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { CHART_THEMES } from "@/lib/chart-themes";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BARS,
  barTotal,
  formatBarValue,
  shouldShowTotal,
  summarizeBarChart,
  topBar,
} from "@/features/bar-chart/bar-chart-schema";
import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";

export type BarChartCardState = "streaming" | "loading" | "ready" | "error";

export interface BarChartCardProperties {
  readonly state: BarChartCardState;
  /**
  The topic from the tool input, shown before the data arrives.
  */
  readonly topic?: string;
  /**
  How many bars were asked for, so the skeleton holds the ready card's height.
  */
  readonly limit?: number;
  readonly data?: BarChartData;
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

/**
The narrowest a bar gets, in percent of its track, so a tiny value still shows a sliver.
*/
const MIN_BAR_PERCENT = 1;

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

function barPercent(value: number, largest: number) {
  return largest
    ? Math.max((Math.abs(value) / largest) * 100, MIN_BAR_PERCENT)
    : MIN_BAR_PERCENT;
}

const SHARE_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "percent",
});

/**
How long each bar waits after the one above it before growing in, so the chart draws top to bottom.
*/
const BAR_STAGGER_MS = 55;

/**
Faint rules at each quarter of the largest bar, drawn behind every track so they read as one set of columns down the chart.
*/
const GRIDLINES =
  "bg-[image:repeating-linear-gradient(to_right,var(--border)_0_1px,transparent_1px_25%)]";

/**
Print-style diagonal hatching for every bar but the leader, which stays solid. Hovering a row fills its bar in.
*/
const HATCH =
  "bg-[image:repeating-linear-gradient(-45deg,currentColor_0_1.5px,transparent_1.5px_4.5px)] group-hover/row:bg-none group-hover/row:bg-current";

/**
This card's colors: amber. Every chart card has its own, so a reply with several charts tells them apart at a glance.
*/
const THEME = CHART_THEMES.bar;

function barTone(value: number, isTop: boolean) {
  if (value < 0) {
    return cn("text-red-500 dark:text-red-400", isTop ? "bg-current" : HATCH);
  }
  return isTop ? cn("bg-current", THEME.solid) : cn(THEME.soft, HATCH);
}

/**
Whether the bars run biggest first, so numbering them as ranks is honest. Categories with their own order (months, age bands) don't get numbers.
*/
function isRanked(data: BarChartData) {
  return data.bars.every(
    (bar, index) => index === 0 || bar.value <= data.bars[index - 1].value
  );
}

function formatRank(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
The total of a parts-of-whole chart. Any other chart has no headline: its largest value already leads the rows.
*/
const Headline = ({ data }: { readonly data: BarChartData }) => {
  if (!shouldShowTotal(data)) {
    return null;
  }
  return (
    <div className="flex h-9 items-baseline gap-2.5">
      <p className="font-mono text-3xl font-semibold tracking-tighter tabular-nums">
        {formatBarValue(barTotal(data), data.scale)}
      </p>
      <p className="text-muted-foreground text-sm">
        total across {data.bars.length}
      </p>
    </div>
  );
};

const BarRows = ({ data }: { readonly data: BarChartData }) => {
  const largest = Math.max(...data.bars.map((bar) => Math.abs(bar.value)));
  const top = topBar(data);
  const total = shouldShowTotal(data) ? barTotal(data) : 0;
  const ranked = isRanked(data);
  return (
    // One grid for every row, so all the tracks share a width however wide
    // each row's value is.
    <ol
      className={cn(
        "group/bars grid gap-x-2",
        ranked &&
          total &&
          "grid-cols-[1.25rem_fit-content(8rem)_1fr_auto_2rem]",
        ranked && !total && "grid-cols-[1.25rem_fit-content(8rem)_1fr_auto]",
        !ranked && total && "grid-cols-[fit-content(8.5rem)_1fr_auto_2rem]",
        !(ranked || total) && "grid-cols-[fit-content(8.5rem)_1fr_auto]"
      )}
    >
      {data.bars.map((bar, index) => {
        const isTop = bar === top;
        return (
          <li
            key={bar.name}
            className="group/row hover:bg-muted/70 col-span-full -mx-1.5 grid h-6 grid-cols-subgrid items-center rounded-sm px-1.5 text-xs transition-[opacity,background-color] duration-200 group-hover/bars:opacity-40 hover:opacity-100"
          >
            {ranked ? (
              <span className="text-muted-foreground/70 font-mono tabular-nums">
                {formatRank(index)}
              </span>
            ) : null}
            <span className={cn("truncate", isTop && "font-semibold")}>
              {bar.name}
            </span>
            <span
              aria-hidden
              className={cn(
                "border-foreground/25 relative flex h-full items-center overflow-hidden border-l",
                GRIDLINES
              )}
            >
              <span
                className={cn(
                  "animate-in slide-in-from-left-full fill-mode-both block h-3 rounded-r-[2px] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none",
                  barTone(bar.value, isTop)
                )}
                style={{
                  animationDelay: `${index * BAR_STAGGER_MS}ms`,
                  width: `${barPercent(bar.value, largest)}%`,
                }}
              />
            </span>
            <span
              className={cn(
                "text-right font-mono font-medium tabular-nums",
                isTop ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {formatBarValue(bar.value, data.scale)}
            </span>
            {total ? (
              <span className="text-muted-foreground/70 text-right font-mono text-xs tabular-nums">
                {SHARE_FORMAT.format(bar.value / total)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

const BarChartReady = ({
  data,
  showAsOf,
}: {
  readonly data: BarChartData;
  readonly showAsOf: boolean;
}) => (
  <div className="flex flex-col gap-3">
    <header className="flex h-5 min-w-0 items-center">
      <p className="truncate text-sm font-semibold">{titleCase(data.topic)}</p>
    </header>

    <Headline data={data} />

    <BarRows data={data} />

    <footer className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground min-w-0 truncate text-xs">
        {data.label}
      </p>
      {showAsOf ? (
        <p className="text-muted-foreground shrink-0 text-xs">
          As of {formatAsOf(data.asOf)}
        </p>
      ) : null}
    </footer>
  </div>
);

const BarChartError = ({
  topic,
  message = "The figures service didn't respond. Try again in a moment.",
}: {
  readonly topic?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {topic
        ? `Couldn't load a chart for ${titleCase(topic)}`
        : "Couldn't load the bar chart"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

/** The card while its data is on the way: the same frame and rows as the
 *  ready card, so nothing moves when the figures land. Shows the topic as
 *  soon as it's known (with "…" while the model is still writing it). */
export const BarChartCardSkeleton = ({
  topic,
  rows = DEFAULT_BARS,
  streaming = false,
  className,
}: {
  readonly topic?: string;
  readonly rows?: number;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "flex flex-col gap-3", className)}>
    <span className="sr-only">
      {topic ? `Loading a chart for ${topic}` : "Loading a bar chart"}
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
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <div
          // The rows are identical placeholders with nothing else to key on.

          key={index}
          className="grid h-6 grid-cols-[8.5rem_1fr] items-center gap-2"
        >
          <div className="bg-muted h-3 w-16 animate-pulse rounded" />
          <div
            className="bg-muted h-3 animate-pulse rounded-r-[2px]"
            style={{ width: `${100 - (index * 60) / rows}%` }}
          />
        </div>
      ))}
    </div>
    <div aria-hidden className="flex h-4 items-center">
      <div className="bg-muted h-3 w-20 animate-pulse rounded" />
    </div>
  </output>
);

export const BarChartCard = ({
  state,
  topic,
  limit,
  data,
  error,
  showAsOf = true,
  className,
}: BarChartCardProperties) => {
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <BarChartError topic={topic} message={error} />
      </div>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <BarChartCardSkeleton
        topic={topic}
        rows={limit}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  return (
    <section
      aria-label={summarizeBarChart(data)}
      className={cn(CARD_FRAME, className)}
    >
      <BarChartReady data={data} showAsOf={showAsOf} />
    </section>
  );
};

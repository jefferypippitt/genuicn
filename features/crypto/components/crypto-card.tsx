"use client";

import { useId, useState } from "react";
import {
  CRYPTO_RANGE_LABEL,
  CRYPTO_RANGES,
  formatCompactMoney,
  formatCryptoPrice,
  formatPercent,
  summarizeCrypto,
} from "@/features/crypto/crypto-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type { CryptoData, CryptoRange } from "@/features/crypto/crypto-schema";

export type CryptoCardState = "streaming" | "loading" | "ready" | "error";

export interface CryptoCardProperties {
  readonly state: CryptoCardState;
  /**
  The symbol from the props, shown before the data arrives.
  */
  readonly symbol?: string;
  readonly data?: CryptoData;
  readonly error?: string;
  /**
  Loads another range when the reader switches it. Without it, the switch is hidden and the card shows the range it was given.
  */
  readonly loadRange?: (
    symbol: string,
    range: CryptoRange
  ) => Promise<CryptoData>;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-sm`;

const LABEL = "text-muted-foreground text-xs";

const UP = "text-emerald-600 dark:text-emerald-400";
const DOWN = "text-red-600 dark:text-red-400";
const UP_PILL = "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400";
const DOWN_PILL = "bg-red-500/12 text-red-700 dark:text-red-400";

const CHART_WIDTH = 200;
const CHART_HEIGHT = 80;
const LABEL_EDGE_PERCENT = 30;

const RANGE_SPAN: Record<CryptoRange, string> = {
  "1m": "the past month",
  "1w": "the past week",
  "1y": "the past year",
  "24h": "the past 24 hours",
  all: "all time",
};

/**
How the time under the pointer reads for each range: the hour while the line covers days, the date over months, the month and year over all time.
*/
const POINT_TIME: Record<CryptoRange, Intl.DateTimeFormatOptions> = {
  "1m": { day: "numeric", hour: "numeric", month: "short" },
  "1w": { hour: "numeric", weekday: "short" },
  "1y": { day: "numeric", month: "short", year: "numeric" },
  "24h": { hour: "numeric", minute: "2-digit", weekday: "short" },
  all: { month: "short", year: "numeric" },
};

const CoinLogo = ({ data }: { readonly data: CryptoData }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        aria-hidden
        className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      >
        {data.symbol.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element, react-doctor/nextjs-no-img-element, jsx-a11y/no-noninteractive-element-interactions -- next/image would force the logo host into the installer's next.config; onError swaps in the letter tile, it is not a user interaction
    <img
      src={data.image}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
};

const ChangePill = ({ data }: { readonly data: CryptoData }) => {
  const isUp = data.changePercent >= 0;
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums",
        isUp ? UP_PILL : DOWN_PILL
      )}
    >
      <span aria-hidden className="text-[10px]">
        {isUp ? "▲" : "▼"}
      </span>
      <span className="sr-only">{isUp ? "Up" : "Down"}</span>
      {formatPercent(data.changePercent)}
    </p>
  );
};

const Stat = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="flex min-w-0 flex-col">
    <dt className={LABEL}>{label}</dt>
    <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
  </div>
);

/**
The time under the pointer, in the reader's own time zone. Only reached once someone points at or focuses the chart, so it never runs during server rendering.
*/
function formatPointTime(time: number, range: CryptoRange) {
  const date = new Date(time);
  return date.toLocaleString("en-US", POINT_TIME[range]);
}

/**
"Since Oct 2013" for the all-time line, in UTC so the server and the browser agree.
*/
function formatSince(time: number) {
  const date = new Date(time);
  const since = date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
  return `Since ${since}`;
}

function labelAlignment(xPercent: number) {
  if (xPercent < LABEL_EDGE_PERCENT) {
    return "translate-x-0";
  }
  return xPercent > 100 - LABEL_EDGE_PERCENT
    ? "-translate-x-full"
    : "-translate-x-1/2";
}

/**
The trend line over the chosen range. Point at it, drag across it, or focus it and use the arrow keys to read the price at each point.
*/
const Sparkline = ({
  data,
  className,
}: {
  readonly data: CryptoData;
  readonly className?: string;
}) => {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const { points } = data;
  if (points.length < 2) {
    return <div className="h-20" />;
  }
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const coords = prices.map((price, index) => [
    (index / (prices.length - 1)) * CHART_WIDTH,
    CHART_HEIGHT - 2 - ((price - min) / span) * (CHART_HEIGHT - 4),
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
  const yPercent =
    active === null ? 0 : (coords[active][1] / CHART_HEIGHT) * 100;

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native range input can't follow the pointer on hover, which is how the chart is read; this keeps the slider semantics and arrow keys
    <div
      tabIndex={0}

      role="slider"
      aria-label={`Price over ${RANGE_SPAN[data.range]}`}
      aria-valuemin={0}
      aria-valuemax={last}
      aria-valuenow={active ?? last}
      aria-valuetext={
        point
          ? `${formatCryptoPrice(point.price, data.currency)} at ${formatPointTime(point.time, data.range)}`
          : summarizeCrypto(data)
      }
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
      onKeyDown={(event) => {
        if (!(event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          return;
        }
        event.preventDefault();
        const step = event.key === "ArrowLeft" ? -1 : 1;
        setActive((current) =>
          Math.min(Math.max((current ?? last) + step, 0), last)
        );
      }}
      className={cn(
        "focus-visible:ring-ring relative h-20 w-full cursor-crosshair touch-pan-y rounded outline-none focus-visible:ring-2",
        className
      )}
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
        className="size-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`}
          fill={`url(#${gradientId})`}
        />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {point ? (
        <>
          <div
            aria-hidden
            className="bg-border pointer-events-none absolute inset-y-0 w-px"
            style={{ left: `${xPercent}%` }}
          />
          <div
            aria-hidden
            className="ring-card pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2"
            style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
          />
          <div
            aria-hidden
            className={cn(
              "bg-popover text-popover-foreground pointer-events-none absolute -top-2 flex -translate-y-full flex-col rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-sm",
              labelAlignment(xPercent)
            )}
            style={{ left: `${xPercent}%` }}
          >
            <span className="font-semibold tabular-nums">
              {formatCryptoPrice(point.price, data.currency)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatPointTime(point.time, data.range)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
};

const RangeSwitch = ({
  shown,
  onSelect,
}: {
  readonly shown: CryptoRange;
  readonly onSelect: (range: CryptoRange) => void;
}) => (
  <fieldset className="bg-muted flex min-w-0 gap-0.5 rounded-lg p-0.5">
    <legend className="sr-only">Range</legend>
    {CRYPTO_RANGES.map((range) => {
      const isSelected = shown === range;
      return (
        <button
          key={range}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(range)}
          className={cn(
            "focus-visible:ring-ring rounded-md px-2 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
            isSelected
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {CRYPTO_RANGE_LABEL[range]}
        </button>
      );
    })}
  </fieldset>
);

const CryptoReady = ({
  data,
  pendingRange,
  rangeError,
  onSelectRange,
}: {
  readonly data: CryptoData;
  readonly pendingRange: CryptoRange | null;
  readonly rangeError: string | null;
  readonly onSelectRange?: (range: CryptoRange) => void;
}) => {
  const isUp = data.changePercent >= 0;
  const firstTime = data.points[0]?.time;
  const note =
    firstTime !== undefined && data.range === "all"
      ? formatSince(firstTime)
      : null;
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CoinLogo data={data} />
          <p className="truncate text-xl font-semibold">{data.name}</p>
        </div>
        <p className="text-muted-foreground shrink-0 font-mono text-lg">
          {data.symbol}
        </p>
      </header>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold tabular-nums">
              {formatCryptoPrice(data.price, data.currency)}
            </p>
            <ChangePill data={data} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4">
            <Stat
              label="Market Cap"
              value={formatCompactMoney(data.marketCap, data.currency)}
            />
            <Stat
              label="24h Volume"
              value={formatCompactMoney(data.volume24h, data.currency)}
            />
          </dl>
        </div>
        <div
          className={cn(
            "transition-opacity duration-150",
            pendingRange && "opacity-40"
          )}
        >
          <Sparkline data={data} className={isUp ? UP : DOWN} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        {onSelectRange ? (
          <RangeSwitch
            shown={pendingRange ?? data.range}
            onSelect={onSelectRange}
          />
        ) : (
          <span className={LABEL}>{CRYPTO_RANGE_LABEL[data.range]}</span>
        )}
        <p className={LABEL} aria-live="polite">
          {rangeError ?? note}
        </p>
      </div>
    </div>
  );
};

const CryptoError = ({
  symbol,
  message = "The crypto price service didn't respond. Try again in a moment.",
}: {
  readonly symbol?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {symbol
        ? `Couldn't load ${symbol.toUpperCase()}`
        : "Couldn't load the price"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

/**
The card while its data is on the way: the same frame and rows as the ready card, so nothing moves when the price lands. Shows the symbol as soon as it's known (with "…" while the model is still writing it).
*/
export const CryptoCardSkeleton = ({
  symbol,
  streaming = false,
  className,
}: {
  readonly symbol?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {symbol ? `Loading the price of ${symbol}` : "Loading a crypto price"}
    </span>
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bar className="size-10 rounded-full" />
          <Bar className="h-5 w-24" />
        </div>
        {symbol ? (
          <p className="text-muted-foreground font-mono text-lg">
            {symbol.toUpperCase()}
            {streaming ? <span>…</span> : null}
          </p>
        ) : (
          <Bar className="h-5 w-12" />
        )}
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex h-8 items-center">
              <Bar className="h-6 w-32" />
            </div>
            <Bar className="h-6 w-16 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            {["Market Cap", "24h Volume"].map((label) => (
              <div key={label} className="flex flex-col">
                <p className={LABEL}>{label}</p>
                <div className="flex h-5 items-center">
                  <Bar className="h-3.5 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Bar className="h-20 w-full" />
      </div>
      <Bar className="h-6 w-44 rounded-lg" />
    </div>
  </output>
);

export const CryptoCard = ({
  state,
  symbol,
  data,
  error,
  loadRange,
  className,
}: CryptoCardProperties) => {
  const [override, setOverride] = useState<CryptoData | null>(null);
  const [pendingRange, setPendingRange] = useState<CryptoRange | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const shown = override ?? data;

  const selectRange = async (range: CryptoRange) => {
    if (!(loadRange && shown) || range === shown.range) {
      return;
    }
    setPendingRange(range);
    setRangeError(null);
    try {
      setOverride(await loadRange(shown.symbol, range));
    } catch {
      setRangeError("Couldn't load that range.");
    }
    setPendingRange(null);
  };

  if (state === "ready" && shown) {
    return (
      <section
        aria-label={summarizeCrypto(shown)}
        className={cn(CARD_FRAME, className)}
      >
        <CryptoReady
          data={shown}
          pendingRange={pendingRange}
          rangeError={rangeError}
          onSelectRange={loadRange ? selectRange : undefined}
        />
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <CryptoError symbol={symbol} message={error} />
      </div>
    );
  }
  return (
    <CryptoCardSkeleton
      symbol={symbol}
      streaming={state === "streaming"}
      className={className}
    />
  );
};

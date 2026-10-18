"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { Button } from "@/components/ui/button";
import { localToday } from "@/features/flights/flight-schema";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { fontWeights } from "@/lib/font-weight";
import { useIcons } from "@/lib/icon-context";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { CARD_SURFACE } from "@/lib/card-frame";
import { cn } from "@/lib/utils";

const MS_PER_DAY = 86_400_000;
const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
});
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
/**
The selection pill's fade, the same 80ms the library's highlights use.
*/
const FADE = { duration: 0.08 } as const;

/**
The first of a month as YYYY-MM-01, from any date in it.
*/
function monthOf(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(month: string, count: number) {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, count: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}

/**
The month's days as YYYY-MM-DD, and how many blank cells go before the 1st so it lands on its weekday.
*/
function daysOf(month: string) {
  const first = new Date(`${month}T00:00:00Z`);
  const next = new Date(`${addMonths(month, 1)}T00:00:00Z`);
  const count = Math.round((next.getTime() - first.getTime()) / MS_PER_DAY);
  return {
    days: Array.from({ length: count }, (_, index) => addDays(month, index)),
    lead: first.getUTCDay(),
  };
}

function readable(date: string) {
  return DAY_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

/**
One day: a radio under a square cell the size of the month buttons (36px, 28px compact). The cell has no hover or fill of its own; the grid's fluid hover highlight and the selection pill sit under it. The number turns semibold when picked over the label's 80ms, inside a fixed-size cell, so nothing reflows.
*/
function Day({
  name,
  date,
  index,
  isPicked,
  isOff,
  isToday,
  registerItem,
  onPick,
}: {
  readonly name: string;
  readonly date: string;
  readonly index: number;
  readonly isPicked: boolean;
  readonly isOff: boolean;
  readonly isToday: boolean;
  readonly registerItem: (index: number, element: HTMLElement | null) => void;
  readonly onPick: (date: string) => void;
}) {
  const reference = useRef<HTMLLabelElement>(null);
  const sizes = useSize();
  const shape = useShape();
  useRegisterFluidHoverItem(registerItem, index, reference);
  return (
    <label
      ref={reference}
      data-off={isOff || undefined}
      className={cn(
        "relative z-10 block justify-self-center",
        isOff ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <input
        type="radio"
        name={name}
        value={date}
        aria-label={isToday ? `${readable(date)}, today` : readable(date)}
        checked={isPicked}
        disabled={isOff}
        onChange={() => onPick(date)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative flex items-center justify-center tabular-nums transition-[color,font-variation-settings] duration-80",
          "peer-focus-visible:ring-ring peer-focus-visible:ring-2",
          sizes.variant === "compact" ? "size-7" : "size-9",
          sizes.text,
          shape.bg,
          isOff ? "text-muted-foreground opacity-50" : "text-foreground"
        )}
        style={{
          fontVariationSettings: isPicked
            ? fontWeights.semibold
            : fontWeights.normal,
        }}
      >
        {Number(date.slice(8))}
        {isToday ? (
          <span className="bg-foreground absolute bottom-1 size-1 rounded-full" />
        ) : null}
      </span>
    </label>
  );
}

/**
A calendar for picking a departure date in a chat, built on the same foundations as the library's lists and tabs: square days the size of the month buttons (36px, 28px compact), one fluid hover highlight that glides across the grid, and the pick on a bg-active pill that springs from day to day. Days before today and past the last bookable day are off. The confirm button calls onConfirm once and locks the calendar with the pick showing.
*/
export default function DatePicker({
  defaultDate,
  maxDays = 330,
  confirmLabel = "Search flights",
  onConfirm,
  className,
}: {
  /**
  The day picked when the calendar opens, as YYYY-MM-DD; tomorrow when left out.
  */
  readonly defaultDate?: string;
  /**
  How many days ahead can be picked.
  */
  readonly maxDays?: number;
  readonly confirmLabel?: string;
  readonly onConfirm?: (date: string) => void;
  readonly className?: string;
}) {
  const name = useId();
  const today = localToday();
  const lastDay = addDays(today, maxDays);
  const [picked, setPicked] = useState(defaultDate ?? addDays(today, 1));
  const [month, setMonth] = useState(() => monthOf(picked));
  const [isLocked, setIsLocked] = useState(false);
  const sizes = useSize();
  const shape = useShape();
  const Chevron = useIcons()["chevron-right"];
  const gridReference = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(gridReference, {
    axis: "xy",
    isItemDisabled: (element) => element.dataset.off === "true",
  });

  const { days, lead } = daysOf(month);
  const pickedIndex = days.indexOf(picked);
  const pickedRect =
    pickedIndex === -1 || !hover.isMeasured
      ? null
      : hover.itemRects[pickedIndex];
  const canGoBack = month > monthOf(today);
  const canGoOn = addMonths(month, 1) <= lastDay;
  const iconSize = sizes.variant === "compact" ? "icon-compact" : "icon";

  return (
    <section
      aria-label="Departure date"
      className={cn(
        CARD_SURFACE,
        "flex w-full max-w-sm flex-col gap-2 p-3",
        shape.container,
        className
      )}
    >
      <header className="flex items-center justify-between">
        <Button
          variant="ghost"
          size={iconSize}
          aria-label="Previous month"
          disabled={!canGoBack || isLocked}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          <Chevron className="rotate-180" />
        </Button>
        <h3
          aria-live="polite"
          className={sizes.type.subtitle}
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {MONTH_FORMAT.format(new Date(`${month}T00:00:00Z`))}
        </h3>
        <Button
          variant="ghost"
          size={iconSize}
          aria-label="Next month"
          disabled={!canGoOn || isLocked}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          <Chevron />
        </Button>
      </header>
      <div aria-hidden className="grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className={cn(
              sizes.type.caption,
              "text-muted-foreground text-center"
            )}
          >
            {weekday}
          </span>
        ))}
      </div>
      <fieldset disabled={isLocked} className="min-w-0">
        <legend className="sr-only">Day</legend>
        <div
          ref={gridReference}
          {...hover.handlers}
          className="relative grid grid-cols-7"
        >
          <FluidHoverHighlight
            hover={hover}
            hidden={isLocked}
            className={shape.bg}
          />
          <AnimatePresence initial={false}>
            {pickedRect ? (
              <motion.div
                key={month}
                aria-hidden
                className={cn(
                  "bg-active pointer-events-none absolute top-0 left-0",
                  shape.bg
                )}
                // Every day cell is the same size, so only the position moves.
                style={{ height: pickedRect.height, width: pickedRect.width }}
                initial={{ opacity: 0, x: pickedRect.left, y: pickedRect.top }}
                animate={{ opacity: 1, x: pickedRect.left, y: pickedRect.top }}
                exit={{ opacity: 0, transition: FADE }}
                transition={{ ...spring.moderate, opacity: FADE }}
              />
            ) : null}
          </AnimatePresence>
          {lead > 0 ? (
            <span aria-hidden style={{ gridColumn: `span ${lead}` }} />
          ) : null}
          {days.map((date, index) => (
            <Day
              key={date}
              name={name}
              date={date}
              index={index}
              isPicked={date === picked}
              isOff={date < today || date > lastDay}
              isToday={date === today}
              registerItem={hover.registerItem}
              onPick={setPicked}
            />
          ))}
        </div>
      </fieldset>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
        <p
          aria-live="polite"
          className={cn(sizes.type.body, "min-w-0 truncate")}
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {readable(picked)}
        </p>
        {isLocked ? (
          <span
            className={cn(sizes.type.caption, "text-muted-foreground shrink-0")}
          >
            Picked
          </span>
        ) : (
          <Button
            onClick={() => {
              setIsLocked(true);
              onConfirm?.(picked);
            }}
          >
            {confirmLabel}
          </Button>
        )}
      </div>
    </section>
  );
}

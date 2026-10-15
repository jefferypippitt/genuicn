"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import {
  isMotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/springs";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import type { MotionValue } from "motion/react";
import type { HTMLAttributes } from "react";

// ─── CarouselDots ───────────────────────────────────────────────────────
// A row of 6px dots, one per slide. The current one stretches into a 24px
// pill. Static, it is solid; with `autoplay` it fills over each slide's
// duration and then moves to the next. Each dot sits in an
// 18px round click area, and one fluid highlight glides between those areas
// on hover, so the target you are about to hit is always visible.

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
Dot height, and the diameter of every resting dot.
*/
const DOT_PX = 6;
/**
Width of the current dot's pill.
*/
const PILL_PX = 24;

/**
The light track every dot shares; the playing pill's fill is darker.
*/
const TRACK_COLOR = "color-mix(in oklab, var(--foreground), transparent 85%)";
const FILL_COLOR = "color-mix(in oklab, var(--foreground), transparent 60%)";

/** The fill is a full-width pill slid in from the left, never scaled:
 *  scaling would squash its rounded end. At 0 a full dot shows, so the clock starts as a perfect circle; at 1 it covers the pill. */
const fillAt = (p: number) => {
  const clamped = Math.min(Math.max(p, 0), 1);
  return `translateX(calc(${clamped - 1} * (100% - ${DOT_PX}px)))`;
};

interface CarouselDotsAutoplay {
  /**
  How long each slide plays before the next one, in ms. Default 3000.
  */
  duration?: number;
  /**
  Holds the fill where it is, e.g. while the pointer is over the slide.
  */
  paused?: boolean;
  /**
  After the last slide, go back to the first. Default true.
  */
  loop?: boolean;
}

interface CarouselDotsProperties extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  /**
  How many dots to show.
  */
  readonly count: number;
  /**
  Index of the current dot.
  */
  readonly value: number;
  /**
  Called with the index of a clicked dot, and with the next index each time autoplay finishes a slide.
  */
  readonly onValueChange?: (index: number) => void;
  /** Autoplay: the current pill fills over `duration`, then the next slide
   *  comes in. `true` uses the defaults. Omit it for a static, solid pill. */
  readonly autoplay?: boolean | CarouselDotsAutoplay;
  /** Drive the fill yourself, from 0 to 1, when something else owns the clock. A MotionValue moves it every frame without re-rendering.
   *  Takes precedence over `autoplay`. */
  readonly progress?: number | MotionValue<number>;
  /**
  Accessible name for each dot. Defaults to "Go to slide N".
  */
  readonly getLabel?: (index: number) => string;
}

const defaultLabel = (index: number) => `Go to slide ${index + 1}`;
const DEFAULT_DURATION = 3000;
/**
A frame longer than this is a stall (a background tab), not playback.
*/
const MAX_FRAME_MS = 100;

const CarouselDots = forwardRef<HTMLDivElement, CarouselDotsProperties>(
  (
    {
      count,
      value,
      onValueChange,
      autoplay,
      progress,
      getLabel = defaultLabel,
      className,
      ...properties
    },
    reference
  ) => {
    const containerReference = useRef<HTMLDivElement>(null);
    const hover = useFluidHover(containerReference, { axis: "x" });
    const reduced = useReducedMotion();

    const options = autoplay === true ? {} : autoplay || null;
    const isAutoplaying = options !== null && progress === undefined;
    const duration = options?.duration ?? DEFAULT_DURATION;
    const paused = options?.paused ?? false;
    const loop = options?.loop ?? true;

    // One local motion value serves every mode: a static pill sits at 1, a
    // number is copied in, and autoplay advances it on its own clock.
    const local = useMotionValue(
      typeof progress === "number" ? progress : isAutoplaying ? 0 : 1
    );
    useEffect(() => {
      if (typeof progress === "number") {
        local.set(progress);
      } else if (progress === undefined && !isAutoplaying) {
        local.set(1);
      }
    }, [progress, isAutoplaying, local]);

    // Autoplay restarts the fill whenever the slide changes, whoever changed
    // it: a click, the clock itself, or the parent. `waiting` is set once
    // the clock has asked for the next slide, so it asks once, not every
    // frame, if the parent is slow to (or chooses not to) move on.
    const waiting = useRef(false);
    useEffect(() => {
      waiting.current = false;
      if (isAutoplaying) {
        local.set(0);
      }
    }, [value, isAutoplaying, local]);

    // Latest values behind refs, so the clock never restarts on a render.
    const live = useRef({
      value,
      count,
      duration,
      paused,
      loop,
      onValueChange,
    });
    useIsoLayoutEffect(() => {
      live.current = { value, count, duration, paused, loop, onValueChange };
    });

    useEffect(() => {
      // Reduced motion: no timer moves the page on the reader's behalf.
      if (!isAutoplaying || reduced) {
        return;
      }
      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = now - last;
        last = now;
        const l = live.current;
        if (!l.paused && !waiting.current && dt < MAX_FRAME_MS) {
          const next = local.get() + dt / l.duration;
          if (next < 1) {
            local.set(next);
          } else if (l.loop || l.value < l.count - 1) {
            local.set(1);
            waiting.current = true;
            l.onValueChange?.((l.value + 1) % l.count);
          } else {
            local.set(1);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [isAutoplaying, reduced, local]);

    const source = isMotionValue(progress) ? progress : local;
    const fillTransform = useTransform(source, fillAt);

    return (
      <div
        ref={(node) => {
          containerReference.current = node;
          if (typeof reference === "function") {
            reference(node);
          } else if (reference) {
            reference.current = node;
          }
        }}
        role="group"
        aria-label="Slides"
        className={cn("relative flex w-fit items-center", className)}
        {...hover.handlers}
        {...properties}
      >
        <FluidHoverHighlight hover={hover} className="rounded-full" />
        {Array.from({ length: count }, (_, index) => (
          <Dot
            key={index}
            index={index}
            label={getLabel(index)}
            current={index === value}
            fillTransform={fillTransform}
            reduced={reduced === true}
            registerItem={hover.registerItem}
            onSelect={onValueChange}
          />
        ))}
      </div>
    );
  }
);

CarouselDots.displayName = "CarouselDots";

const Dot = ({
  index,
  label,
  current,
  fillTransform,
  reduced,
  registerItem,
  onSelect,
}: {
  readonly index: number;
  readonly label: string;
  readonly current: boolean;
  readonly fillTransform: MotionValue<string>;
  readonly reduced: boolean;
  readonly registerItem: (index: number, element: HTMLElement | null) => void;
  readonly onSelect?: (index: number) => void;
}) => {
  const reference = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, reference);
  return (
    <button
      ref={reference}
      type="button"
      onClick={() => onSelect?.(index)}
      aria-label={label}
      aria-current={current ? "true" : undefined}
      // Equal padding on every side: an 18px round click area per dot, and
      // 12px between dots. No gap, so the highlight never drops out.
      className="relative z-10 flex items-center rounded-full p-1.5 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
    >
      <motion.span
        className="relative block overflow-hidden rounded-full"
        style={{ height: DOT_PX, backgroundColor: TRACK_COLOR }}
        initial={false}
        animate={{ width: current ? PILL_PX : DOT_PX }}
        // Width is a layout value, which MotionConfig's reduced motion does
        // not cover, so the dot gates it itself: instant under reduced motion.
        transition={reduced ? { duration: 0 } : spring.moderate}
      >
        {current ? (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: FILL_COLOR, transform: fillTransform }}
          />
        ) : null}
      </motion.span>
    </button>
  );
};

export { CarouselDots };
export type {
  CarouselDotsProperties as CarouselDotsProps,
  CarouselDotsAutoplay,
};

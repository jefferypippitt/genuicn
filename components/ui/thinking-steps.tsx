"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useContext,
  createContext,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "@/lib/utils";
import { useIcons } from "@/lib/icon-context";
import { spring } from "@/lib/springs";
import { omit } from "@/lib/omit";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { SizeProvider, useSize, typeClass } from "@/lib/size-context";
import { Badge } from "@/components/ui/badge";
import type { SizeVariant } from "@/lib/size-context";
import type { ReactNode, HTMLAttributes } from "react";
import type { IconName } from "@/lib/icon-context";
import type { BadgeColor } from "@/components/ui/badge";

// SSR-safe layout effect (client components still server-render in Next).
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// ─── Shared collapsible parts ───────────────────────────────────────────────
//
// ThinkingSteps and ThinkingStepDetails are both single collapsible sections,
// built directly on Base UI's Collapsible (Root/Trigger/Panel) with the
// library's Motion springs layered on top.

/**
Open state of the nearest ThinkingSteps root, for the header trigger/panel.
*/
const ThinkingStepsOpenContext = createContext(false);

interface TriggerRowProperties extends HTMLAttributes<HTMLButtonElement> {
  readonly open: boolean;
  readonly children: ReactNode;
}

/**
 * Trigger row: hover background, dual-layer variable-weight label, and a
 * chevron that rotates from right (closed) to down (open). Mirrors the
 * library's accordion trigger styling.
 */
const TriggerRow = forwardRef<HTMLButtonElement, TriggerRowProperties>(
  ({ open, children, className, ...properties }, reference) => {
    const icons = useIcons();
    const ChevronRight = icons["chevron-right"];
    const shape = useShape();
    const sizeClasses = useSize();
    const [isHovered, setIsHovered] = useState(false);
    const highlighted = open || isHovered;

    return (
      <div
        className="relative w-fit"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isHovered ? (
            <motion.div
              className={`absolute inset-0 ${shape.bg} bg-hover pointer-events-none`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ duration: 0.08 }}
            />
          ) : null}
        </AnimatePresence>
        <Collapsible.Trigger
          ref={reference}
          className={cn(
            `relative z-10 flex items-center gap-2.5 ${shape.item} ${sizeClasses.px} ${
              sizeClasses.variant === "compact" ? "py-1.5" : "py-2"
            } cursor-pointer outline-none select-none`,
            "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0",
            className
          )}
          {...(properties as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {/* Label with dual-layer text (invisible bold layer reserves width) */}
          <span className={cn("inline-grid text-left", sizeClasses.text)}>
            <span
              className="invisible col-start-1 row-start-1"
              style={{ fontVariationSettings: fontWeights.semibold }}
              aria-hidden="true"
            >
              {children}
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80",
                highlighted ? "text-foreground" : "text-muted-foreground"
              )}
              style={{
                fontVariationSettings: open
                  ? fontWeights.semibold
                  : fontWeights.normal,
              }}
            >
              {children}
            </span>
          </span>

          {/* Chevron — right when collapsed, rotates 90° down when expanded */}
          <motion.span
            className="inline-flex shrink-0 items-center justify-center"
            animate={{ rotate: open ? 90 : 0 }}
            transition={spring.fast}
          >
            <ChevronRight
              size={sizeClasses.icon}
              strokeWidth={highlighted ? 2 : 1.5}
              className={cn(
                "transition-[color,stroke-width] duration-80",
                highlighted ? "text-foreground" : "text-muted-foreground"
              )}
            />
          </motion.span>
        </Collapsible.Trigger>
      </div>
    );
  }
);
TriggerRow.displayName = "ThinkingStepsTriggerRow";

interface CollapsePanelProperties {
  readonly open: boolean;
  readonly children: ReactNode;
}

/**
 * Collapsible panel with a Motion height + spring animation.
 *
 * Base UI's Panel would apply `hidden` the moment a controlled collapsible
 * closes (it can't observe the JS-driven exit animation), which is
 * `display: none` and would freeze the exit mid-flight. So we render through
 * `keepMounted` + `render`, strip Base UI's premature `hidden`, and only
 * apply the attribute ourselves once the framer exit has actually completed.
 * The persistent panel element keeps the trigger ↔ panel ARIA contract
 * intact (the trigger's `aria-controls` id lives on it).
 */
const CollapsePanel = ({ open, children }: CollapsePanelProperties) => {
  const isCompactStep = useSize().variant === "compact";
  // The open height is animated to a self-measured LAYOUT pixel value, not
  // `height: "auto"`: framer resolves an "auto" target by measuring the
  // element's *visual* (transformed) size, so under a scaled ancestor
  // (e.g. /demo's 1.7x card) the animation overshoots to scale× the real
  // height and snaps back when the final "auto" lands. offsetHeight and
  // ResizeObserver are transform-immune. Same setup as the accordions.
  const innerReference = useRef<HTMLDivElement | null>(null);
  const roReference = useRef<ResizeObserver | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  // Panels open at mount render `initial: "auto"` and receive their first
  // pixel target a commit later; that hand-off must SNAP (duration 0), not
  // spring. Panels that open later spring normally.
  const [needsSnap, setNeedsSnap] = useState(open);

  const measureReference = useCallback((element: HTMLDivElement | null) => {
    roReference.current?.disconnect();
    roReference.current = null;
    innerReference.current = element;
    if (!element) {
      return;
    }
    if (element.offsetHeight > 0) {
      setContentHeight(element.offsetHeight);
    }
    const ro = new ResizeObserver(() => {
      // Ignore the 0 that fires while the panel is display:none.
      if (element.offsetHeight > 0) {
        setContentHeight(element.offsetHeight);
      }
    });
    ro.observe(element);
    roReference.current = ro;
  }, []);

  // Re-measure synchronously (pre-paint) when opening, so the spring's
  // target is the fresh layout height from its first frame.
  useIsoLayoutEffect(() => {
    if (
      open &&
      innerReference.current &&
      innerReference.current.offsetHeight > 0
    ) {
      setContentHeight(innerReference.current.offsetHeight);
    }
  }, [open]);

  // Cleared a frame after the first measured height commits: the hand-off
  // render keeps the snap, and height changes after it spring.
  useEffect(() => {
    if (!needsSnap || contentHeight === null) {
      return;
    }
    const frame = requestAnimationFrame(() => setNeedsSnap(false));
    return () => cancelAnimationFrame(frame);
  }, [needsSnap, contentHeight]);

  const [exitComplete, setExitComplete] = useState(!open);
  if (open && exitComplete) {
    // Reset during render so the panel is un-hidden before the opening
    // animation's first paint.
    setExitComplete(false);
  }

  return (
    <Collapsible.Panel
      keepMounted
      render={(panelProperties) => {
        const restPanel = omit(
          panelProperties as React.HTMLAttributes<HTMLDivElement>,
          [
            // Applied too early for our exit animation (see above); we
            // control the attribute ourselves.
            "hidden",
            // Only carries the --collapsible-panel-height/width vars, which
            // stay 'auto' since Base UI never measures JS-driven animations.
            "style",
          ]
        );
        return (
          <div {...restPanel} hidden={!open && exitComplete}>
            <motion.div
              className="overflow-hidden"
              initial={{ height: open ? "auto" : 0 }}
              animate={{ height: open ? (contentHeight ?? 0) : 0 }}
              // bounce: 0 — pure height looks better without overshoot.
              transition={
                needsSnap ? { duration: 0 } : { ...spring.moderate, bounce: 0 }
              }
              onAnimationComplete={() => {
                if (!open) {
                  setExitComplete(true);
                }
              }}
            >
              <div
                ref={measureReference}
                className={cn(
                  "text-muted-foreground px-3 pt-1 pb-3",
                  typeClass("body", isCompactStep ? "compact" : "default")
                )}
              >
                {children}
              </div>
            </motion.div>
          </div>
        );
      }}
    />
  );
};

// ─── ThinkingSteps (root) ───────────────────────────────────────────────────

interface ThinkingStepsProperties extends HTMLAttributes<HTMLDivElement> {
  /**
  Step on the size ladder. Wins over the surrounding SizeProvider and propagates to every row inside.
  */
  readonly size?: SizeVariant;
  readonly defaultOpen?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}

const ThinkingSteps = forwardRef<HTMLDivElement, ThinkingStepsProperties>(
  (
    {
      size,
      defaultOpen = true,
      open,
      onOpenChange,
      children,
      className,
      ...properties
    },
    reference
  ) => {
    // Always drive Base UI as controlled so the header/panel can read the
    // open state (chevron rotation, framer enter/exit) from context.
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isOpen = open ?? internalOpen;

    const root = (
      <Collapsible.Root
        ref={reference}
        open={isOpen}
        onOpenChange={(next: boolean) => {
          if (open === undefined) {
            setInternalOpen(next);
          }
          onOpenChange?.(next);
        }}
        className={cn("w-80 max-w-full", className)}
        {...properties}
      >
        <ThinkingStepsOpenContext.Provider value={isOpen}>
          {children}
        </ThinkingStepsOpenContext.Provider>
      </Collapsible.Root>
    );

    // A size prop pins every row inside to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
);
ThinkingSteps.displayName = "ThinkingSteps";

// ─── ThinkingStepsHeader ────────────────────────────────────────────────────

interface ThinkingStepsHeaderProperties extends HTMLAttributes<HTMLButtonElement> {
  readonly children?: ReactNode;
}

const ThinkingStepsHeader = forwardRef<
  HTMLButtonElement,
  ThinkingStepsHeaderProperties
>(({ children = "Thinking", className, ...properties }, reference) => {
  const isOpen = useContext(ThinkingStepsOpenContext);
  return (
    <TriggerRow
      ref={reference}
      open={isOpen}
      className={className}
      {...properties}
    >
      {children}
    </TriggerRow>
  );
});
ThinkingStepsHeader.displayName = "ThinkingStepsHeader";

// ─── ThinkingStepsContent ───────────────────────────────────────────────────

interface ThinkingStepsContentProperties extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

const ThinkingStepsContent = forwardRef<
  HTMLDivElement,
  ThinkingStepsContentProperties
>(({ children, className, ...properties }, reference) => {
  const isOpen = useContext(ThinkingStepsOpenContext);
  return (
    <CollapsePanel open={isOpen}>
      <div
        ref={reference}
        className={cn("flex flex-col", className)}
        {...properties}
      >
        {children}
      </div>
    </CollapsePanel>
  );
});
ThinkingStepsContent.displayName = "ThinkingStepsContent";

// ─── ThinkingStep ───────────────────────────────────────────────────────────

type StepStatus = "complete" | "active" | "pending";

interface ThinkingStepProperties {
  readonly icon?: IconName;
  readonly showIcon?: boolean;
  readonly label: string;
  readonly description?: string;
  readonly status?: StepStatus;
  readonly delay?: number;
  readonly isLast?: boolean;
  readonly children?: ReactNode;
  readonly className?: string;
}

/** Measured layout height for a step's opening animation. `height: "auto"`
 *  is resolved by framer from the element's *visual* (transformed) size, so
 *  under a scaled ancestor (the /demo card) every step springs out to scale x
 *  its real height and snaps back when "auto" lands — the whole list visibly
 *  overshoots as it builds. offsetHeight and ResizeObserver are
 *  transform-immune. Same setup as CollapsePanel above. */
function useStepHeight() {
  const roReference = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const reference = useCallback((element: HTMLDivElement | null) => {
    roReference.current?.disconnect();
    roReference.current = null;
    if (!element) {
      return;
    }
    const sync = () => {
      if (element.offsetHeight > 0) {
        setHeight(element.offsetHeight);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(element);
    roReference.current = ro;
  }, []);
  return [reference, height] as const;
}

const ThinkingStep = ({
  icon = "dot",
  showIcon = true,
  label,
  description,
  status = "complete",
  delay = 0.08,
  isLast = false,
  children,
  className,
}: ThinkingStepProperties) => {
  const icons = useIcons();
  const Icon = icons[icon];
  const shape = useShape();
  const sizeClasses = useSize();
  const [stepReference, stepHeight] = useStepHeight();

  if (status === "pending") {
    return null;
  }

  const isActive = status === "active";

  return (
    /*
      Outer: animates height to create space smoothly
      */
    <motion.div
      className={cn("relative z-10 overflow-hidden", className)}
      initial={{ height: 0 }}
      animate={{ height: stepHeight ?? 0 }}
      transition={spring.slow}
    >
      {/* Inner: fades content in after space starts opening — and is the
            element measured for the height above. */}
      <motion.div
        ref={stepReference}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, delay, ease: "easeOut" }}
      >
        {/* Content row — this is the fluid hover target */}
        <div className={cn("flex gap-2.5 px-2 py-1.5", shape.item)}>
          {/* Icon column with continuous connector line */}
          <div className="flex w-[14px] shrink-0 flex-col items-center">
            <div className="pt-0.5">
              {showIcon ? (
                <Icon
                  size={sizeClasses.variant === "compact" ? 12 : 14}
                  strokeWidth={1.5}
                  className="text-muted-foreground"
                />
              ) : (
                <div className="flex h-[14px] w-[14px] items-center justify-center">
                  <div className="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full" />
                </div>
              )}
            </div>
            {/* Line stretches from icon to bottom of this step */}
            {!isLast && <div className="bg-border/60 mt-1 w-px flex-1" />}
          </div>

          {/* Text content */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={cn(
                sizeClasses.type.body,
                "text-foreground",
                isActive && "shimmer-text"
              )}
              style={{ fontVariationSettings: fontWeights.semibold }}
            >
              {label}
              {isActive ? "…" : null}
            </span>
            {description ? (
              <span
                className={cn(sizeClasses.type.body, "text-muted-foreground")}
              >
                {description}
              </span>
            ) : null}
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── ThinkingStepDetails (nested collapsible) ───────────────────────────────

interface ThinkingStepDetailsProperties {
  readonly summary: string;
  readonly details?: string[];
  readonly defaultOpen?: boolean;
  readonly children?: ReactNode;
  readonly className?: string;
}

const ThinkingStepDetails = ({
  summary,
  details,
  defaultOpen = false,
  children,
  className,
}: ThinkingStepDetailsProperties) => {
  const isCompactStep = useSize().variant === "compact";
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn("mt-1 -ml-3", className)}
    >
      <TriggerRow open={open} className="gap-1.5 px-3 py-1">
        {summary}
      </TriggerRow>
      <CollapsePanel open={open}>
        <div className="flex flex-col gap-0.5 pt-0.5">
          {details?.map((item, index) => (
            <span
              key={index}
              className={cn(
                "text-muted-foreground",
                typeClass("caption", isCompactStep ? "compact" : "default")
              )}
            >
              {item}
            </span>
          ))}
          {children}
        </div>
      </CollapsePanel>
    </Collapsible.Root>
  );
};

// ─── ThinkingStepSources ────────────────────────────────────────────────────

interface ThinkingStepSourcesProperties extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

const ThinkingStepSources = forwardRef<
  HTMLDivElement,
  ThinkingStepSourcesProperties
>(({ children, className, ...properties }, reference) => (
  <div
    ref={reference}
    className={cn("mt-1 flex flex-wrap gap-1.5", className)}
    {...properties}
  >
    {children}
  </div>
));
ThinkingStepSources.displayName = "ThinkingStepSources";

// ─── ThinkingStepSource ─────────────────────────────────────────────────────

interface ThinkingStepSourceProperties {
  readonly color?: BadgeColor;
  readonly delay?: number;
  readonly children: ReactNode;
  readonly className?: string;
}

const ThinkingStepSource = ({
  color = "gray",
  delay = 0,
  children,
  className,
}: ThinkingStepSourceProperties) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    transition={{
      ...spring.moderate,
      delay,
      filter: { duration: 0.12, delay },
    }}
  >
    <Badge variant="solid" size="sm" color={color} className={className}>
      {children}
    </Badge>
  </motion.span>
);
ThinkingStepSource.displayName = "ThinkingStepSource";

// ─── ThinkingStepImage ──────────────────────────────────────────────────────

interface ThinkingStepImageProperties {
  readonly src: string;
  readonly alt?: string;
  readonly caption?: string;
  readonly delay?: number;
  readonly className?: string;
}

const ThinkingStepImage = ({
  src,
  alt = "",
  caption,
  delay = 0,
  className,
}: ThinkingStepImageProperties) => {
  const shape = useShape();
  // The caption role of the type scale — see /docs/sizes.
  const isCompact = useSize().variant === "compact";
  return (
    <motion.div
      className={cn("mt-1.5", className)}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{
        opacity: { duration: 0.2, delay, ease: "easeOut" },
        filter: { duration: 0.15, delay },
      }}
    >
      {/* Screenshots often end in white; an inset neutral hairline keeps the
          edge visible without changing the measured image or panel height. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- src is any caller URL; next/image needs that host in next.config and only works in Next */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full max-w-[200px] object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10",
          shape.container
        )}
      />
      {caption && (
        <span
          className={cn(
            typeClass("caption", isCompact ? "compact" : "default"),
            "text-muted-foreground mt-1 block"
          )}
        >
          {caption}
        </span>
      )}
    </motion.div>
  );
};
ThinkingStepImage.displayName = "ThinkingStepImage";

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  ThinkingSteps,
  ThinkingStepsHeader,
  ThinkingStepsContent,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepSources,
  ThinkingStepSource,
  ThinkingStepImage,
};

export type {
  ThinkingStepsProperties as ThinkingStepsProps,
  ThinkingStepsHeaderProperties as ThinkingStepsHeaderProps,
  ThinkingStepsContentProperties as ThinkingStepsContentProps,
  ThinkingStepProperties as ThinkingStepProps,
  ThinkingStepDetailsProperties as ThinkingStepDetailsProps,
  ThinkingStepSourcesProperties as ThinkingStepSourcesProps,
  ThinkingStepSourceProperties as ThinkingStepSourceProps,
  ThinkingStepImageProperties as ThinkingStepImageProps,
  StepStatus,
};

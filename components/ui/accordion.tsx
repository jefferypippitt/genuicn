"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  forwardRef,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cn } from "@/lib/utils";
import { useIcons } from "@/lib/icon-context";
import { spring } from "@/lib/springs";
import { omit } from "@/lib/omit";
import { fontWeights } from "@/lib/font-weight";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { useShape } from "@/lib/shape-context";
import { SizeProvider, useSize } from "@/lib/size-context";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import type { SizeVariant } from "@/lib/size-context";
import type { ReactNode, HTMLAttributes } from "react";

// SSR-safe layout effect (client components still server-render in Next).
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// ─── Contexts ────────────────────────────────────────────────────────────────

interface ItemRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface AccordionGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  registerFullItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  grouped: true;
  remeasure: () => void;
  openValues: Set<string>;
  openItemRects: Map<number, ItemRect>;
}

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(
  null
);

function useAccordionGroup() {
  return useContext(AccordionGroupContext);
}

interface AccordionItemContextValue {
  index?: number;
  value: string;
  isOpen: boolean;
  triggerRef: React.MutableRefObject<HTMLDivElement | null>;
  /**
  Standalone items carry the group's choice themselves.
  */
  highlight: "trigger" | "item";
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null
);

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      "AccordionTrigger/AccordionContent must be used within an AccordionItem"
    );
  }
  return context;
}

// ─── AccordionGroup ──────────────────────────────────────────────────────────

interface AccordionGroupSingleProperties {
  type?: "single";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
}

interface AccordionGroupMultipleProperties {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

type AccordionGroupProperties = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  readonly size?: SizeVariant;
  /**
  What an open item tints. "item" paints the row and its panel as one block, and holds while it stays open. "trigger" scopes the fill to the row and shows it on hover only, leaving the panel on the page's own surface — the way a sidebar row highlights without colouring its sub-tree. @default "item"
  */
  readonly highlight?: "trigger" | "item";
} & (AccordionGroupSingleProperties | AccordionGroupMultipleProperties);

const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProperties>(
  (properties, reference) => {
    const {
      children,
      highlight = "item",
      type = "single",
      size,
      className,
      ...rest
    } = properties;

    const containerReference = useRef<HTMLDivElement>(null);
    const fullItemElementsReference = useRef<Map<number, HTMLElement>>(
      new Map()
    );
    const [openItemRects, setOpenItemRects] = useState<Map<number, ItemRect>>(
      new Map()
    );
    const openItemRectsReference = useRef(openItemRects);

    const hover = useFluidHover(containerReference);
    const {
      activeIndex,
      setActiveIndex,
      itemRects,
      handlers,
      registerItem,
      measureItems,
    } = hover;

    const registerFullItem = useCallback(
      (index: number, element: HTMLElement | null) => {
        if (element) {
          fullItemElementsReference.current.set(index, element);
        } else {
          fullItemElementsReference.current.delete(index);
        }
      },
      []
    );

    const measureFullItems = useCallback(() => {
      if (!containerReference.current) {
        return;
      }
      const next = new Map<number, ItemRect>();
      fullItemElementsReference.current.forEach((element, index) => {
        next.set(index, {
          top: element.offsetTop,
          left: element.offsetLeft,
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
      });
      // Skip the state update when nothing moved (mirrors the fluid hover
      // hook's measureItems guard) — this runs per animation frame via
      // onUpdate, and an unconditional set would invalidate the group
      // context and re-render every item even on no-op remeasures.
      const previous = openItemRectsReference.current;
      let isChanged = previous.size !== next.size;
      if (!isChanged) {
        for (const [index, r] of next) {
          const p = previous.get(index);
          if (
            !p ||
            p.top !== r.top ||
            p.left !== r.left ||
            p.width !== r.width ||
            p.height !== r.height
          ) {
            isChanged = true;
            break;
          }
        }
      }
      if (!isChanged) {
        return;
      }
      openItemRectsReference.current = next;
      setOpenItemRects(next);
    }, []);

    const [internalSingleValue, setInternalSingleValue] = useState<string>(
      () => {
        if (type === "single") {
          const sp = properties as AccordionGroupSingleProperties;
          return sp.defaultValue ?? "";
        }
        return "";
      }
    );
    const [internalMultipleValue, setInternalMultipleValue] = useState<
      string[]
    >(() => {
      if (type === "multiple") {
        const mp = properties as AccordionGroupMultipleProperties;
        return mp.defaultValue ?? [];
      }
      return [];
    });
    const singleOnValueChange = (properties as AccordionGroupSingleProperties)
      .onValueChange;
    const multipleOnValueChange = (
      properties as AccordionGroupMultipleProperties
    ).onValueChange;

    const openValuesList: string[] =
      type === "multiple"
        ? ((properties as AccordionGroupMultipleProperties).value ??
          internalMultipleValue)
        : (() => {
            const v =
              (properties as AccordionGroupSingleProperties).value ??
              internalSingleValue;
            return v ? [v] : [];
          })();

    // Keyed on the serialized values so the Set (and the group context
    // value below) keeps a stable identity across re-renders where the open
    // values haven't actually changed.
    const openValuesKey = JSON.stringify(openValuesList);

    const openValues = useMemo(
      () => new Set(JSON.parse(openValuesKey) as string[]),
      [openValuesKey]
    );

    const handleSingleValueChange = useCallback(
      (value: string) => {
        if (singleOnValueChange) {
          singleOnValueChange(value);
        } else {
          setInternalSingleValue(value);
        }
      },
      [singleOnValueChange]
    );

    const handleMultipleValueChange = useCallback(
      (value: string[]) => {
        if (multipleOnValueChange) {
          multipleOnValueChange(value);
        } else {
          setInternalMultipleValue(value);
        }
      },
      [multipleOnValueChange]
    );

    useEffect(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems, children]);

    useEffect(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems, openValuesKey]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];
    // An open item tints its trigger by default; "item" restores the older
    // block treatment that spans the panel too. The trigger rects are the
    // ones fluid hover already tracks, so this is a choice of source.
    // "trigger" tints the open row only while you're on it: the panel below
    // already says the item is open, so the fill goes back to being a hover
    // affordance rather than a persistent state.
    const expandedRects =
      highlight === "item"
        ? openItemRects
        : new Map(
            [...openItemRects.keys()].flatMap((index) => {
              const rect = index === activeIndex ? itemRects[index] : null;
              return rect ? ([[index, rect]] as [number, ItemRect][]) : [];
            })
          );

    const isHoveringNonOpen =
      activeIndex !== null && !openItemRects.has(activeIndex);
    const shape = useShape();

    const htmlProperties = omit(rest as Record<string, unknown>, [
      "value",
      "defaultValue",
      "onValueChange",
      "collapsible",
      "type",
    ]);

    // Translate FF API → Base UI Accordion API.
    // Base UI always uses `value: string[]` and a `multiple: boolean`. In
    // single mode we wrap the active value in a single-element array.
    const baseValue: string[] =
      type === "multiple"
        ? ((properties as AccordionGroupMultipleProperties).value ??
          internalMultipleValue)
        : (() => {
            const v =
              (properties as AccordionGroupSingleProperties).value ??
              internalSingleValue;
            return v ? [v] : [];
          })();

    const baseOnValueChange = (next: string[]) => {
      if (type === "multiple") {
        handleMultipleValueChange(next);
      } else {
        handleSingleValueChange(next[0] ?? "");
      }
    };

    const remeasure = useCallback(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems]);

    // Memoized: the group re-renders on every fluid-hover mousemove; a
    // fresh context object each time would re-render every item with it.
    const groupContextValue = useMemo<AccordionGroupContextValue>(() => {
      return {
        registerItem,
        registerFullItem,
        activeIndex,
        grouped: true,
        remeasure,
        openValues,
        openItemRects,
      };
    }, [
      registerItem,
      registerFullItem,
      activeIndex,
      remeasure,
      openValues,
      openItemRects,
    ]);

    const group = (
      <AccordionGroupContext.Provider value={groupContextValue}>
        <AccordionPrimitive.Root
          value={baseValue}
          onValueChange={baseOnValueChange}
          multiple={type === "multiple"}
          render={(rootProperties) => {
            const restRoot = omit(
              rootProperties as React.HTMLAttributes<HTMLDivElement>,
              [
                "style",
                "onDrag",
                "onDragStart",
                "onDragEnd",
                "onAnimationStart",
                "onAnimationEnd",
                "onAnimationIteration",
              ]
            );
            return (
              <div
                {...restRoot}
                ref={(node) => {
                  (
                    containerReference as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                  if (typeof reference === "function") {
                    reference(node);
                  } else if (reference) {
                    (
                      reference as React.MutableRefObject<HTMLDivElement | null>
                    ).current = node;
                  }
                }}
                onMouseEnter={handlers.onMouseEnter}
                onMouseMove={(e) => {
                  const container = containerReference.current;
                  if (container) {
                    const cRect = container.getBoundingClientRect();
                    const layoutH = container.offsetHeight;
                    const visualH = cRect.height;
                    const scale = layoutH > 0 ? visualH / layoutH : 1;
                    const localY =
                      (e.clientY - cRect.top) / scale + container.scrollTop;
                    for (const [index, full] of openItemRects) {
                      const trigger = itemRects[index];
                      if (!trigger) {
                        continue;
                      }
                      const contentTop = trigger.top + trigger.height;
                      const contentBottom = full.top + full.height;
                      if (localY >= contentTop && localY <= contentBottom) {
                        setActiveIndex(null);
                        return;
                      }
                    }
                  }
                  handlers.onMouseMove(e);
                }}
                onMouseLeave={handlers.onMouseLeave}
                onFocus={(e) => {
                  const indexAttribute = (e.target as HTMLElement)
                    .closest("[data-fluid-hover-index]")
                    ?.getAttribute("data-fluid-hover-index");
                  if (indexAttribute != null) {
                    const index = Number(indexAttribute);
                    setActiveIndex(index);
                    setFocusedIndex(
                      (e.target as HTMLElement).matches(":focus-visible")
                        ? index
                        : null
                    );
                  }
                }}
                onBlur={(e) => {
                  if (
                    containerReference.current?.contains(
                      e.relatedTarget as Node
                    )
                  ) {
                    return;
                  }
                  setFocusedIndex(null);
                  setActiveIndex(null);
                }}
                className={cn(
                  "relative flex w-72 max-w-full flex-col",
                  className
                )}
                {...(htmlProperties as HTMLAttributes<HTMLDivElement>)}
              >
                {/* Expanded item backgrounds */}
                <AnimatePresence>
                  {[...expandedRects.entries()].map(([index, rect]) => (
                    <motion.div
                      key={`expanded-${index}`}
                      className={`absolute ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
                      // Fade in from the item's current rect: with initial={false}
                      // a newly-opened item's background would pop in at full
                      // opacity mid-layout-shift while the previous item's bg is
                      // still fading out — reads as a glitch when switching items
                      // (especially under /demo's scaled card). Geometry still
                      // snaps (duration 0) so the bg hugs the animating item.
                      initial={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: 0,
                      }}
                      animate={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: isHoveringNonOpen ? 0.7 : 1,
                      }}
                      exit={{ opacity: 0, transition: spring.moderate.exit }}
                      transition={{
                        top: { duration: 0 },
                        left: { duration: 0 },
                        width: { duration: 0 },
                        height: { duration: 0 },
                        opacity: { duration: 0.12 },
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* Hover background */}
                <FluidHoverHighlight hover={hover} className={shape.bg} />

                {/* Focus ring */}
                <AnimatePresence>
                  {focusRect ? (
                    <motion.div
                      className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]`}
                      initial={false}
                      animate={{
                        left: focusRect.left - 2,
                        top: focusRect.top - 2,
                        width: focusRect.width + 4,
                        height: focusRect.height + 4,
                      }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      transition={{
                        ...spring.fast,
                        opacity: { duration: 0.08 },
                      }}
                    />
                  ) : null}
                </AnimatePresence>

                {children}
              </div>
            );
          }}
        />
      </AccordionGroupContext.Provider>
    );

    // A size prop pins every row in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group;
  }
);

AccordionGroup.displayName = "AccordionGroup";

// ─── Accordion (Standalone) ──────────────────────────────────────────────────

interface AccordionProperties extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly type?: "single" | "multiple";
  readonly collapsible?: boolean;
  readonly defaultValue?: string | string[];
  readonly value?: string | string[];
  readonly onValueChange?:
    ((value: string) => void) | ((value: string[]) => void);
  /** Pins the accordion's rows to one step of the size ladder (default 36px,
   *  compact 28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  readonly size?: SizeVariant;
}

const Accordion = forwardRef<HTMLDivElement, AccordionProperties>(
  (
    {
      children,
      type = "single",
      collapsible = true,
      defaultValue,
      value,
      onValueChange,
      size,
      className,
      ...properties
    },
    reference
  ) => {
    void collapsible; // Base UI's single-mode is always collapsible.

    const [internalSingleValue, setInternalSingleValue] = useState<string>(
      () => (type === "single" ? ((defaultValue as string) ?? "") : "")
    );
    const [internalMultipleValue, setInternalMultipleValue] = useState<
      string[]
    >(() => (type === "multiple" ? ((defaultValue as string[]) ?? []) : []));

    const openValues = new Set<string>(
      type === "multiple"
        ? ((value as string[] | undefined) ?? internalMultipleValue)
        : (() => {
            const v = (value as string | undefined) ?? internalSingleValue;
            return v ? [v] : [];
          })()
    );

    const handleSingleChange = useCallback(
      (v: string) => {
        if (onValueChange) {
          (onValueChange as (v: string) => void)(v);
        } else {
          setInternalSingleValue(v);
        }
      },
      [onValueChange]
    );

    const handleMultipleChange = useCallback(
      (v: string[]) => {
        if (onValueChange) {
          (onValueChange as (v: string[]) => void)(v);
        } else {
          setInternalMultipleValue(v);
        }
      },
      [onValueChange]
    );

    const baseValue: string[] =
      type === "multiple"
        ? ((value as string[] | undefined) ?? internalMultipleValue)
        : (() => {
            const v = (value as string | undefined) ?? internalSingleValue;
            return v ? [v] : [];
          })();

    const baseOnValueChange = (next: string[]) => {
      if (type === "multiple") {
        handleMultipleChange(next);
      } else {
        handleSingleChange(next[0] ?? "");
      }
    };

    const root = (
      <AccordionPrimitive.Root
        value={baseValue}
        onValueChange={baseOnValueChange}
        multiple={type === "multiple"}
        render={(rootProperties) => {
          const restRoot = omit(
            rootProperties as React.HTMLAttributes<HTMLDivElement>,
            ["style"]
          );
          return (
            <div
              {...restRoot}
              ref={reference}
              className={cn("flex w-72 max-w-full flex-col", className)}
              {...properties}
            >
              <StandaloneOpenContext.Provider value={openValues}>
                {children}
              </StandaloneOpenContext.Provider>
            </div>
          );
        }}
      />
    );

    // A size prop pins every row to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
);

Accordion.displayName = "Accordion";

const StandaloneOpenContext = createContext<Set<string>>(new Set());

// ─── AccordionItem ───────────────────────────────────────────────────────────

interface AccordionItemProperties extends HTMLAttributes<HTMLDivElement> {
  readonly value: string;
  readonly index?: number;
  readonly disabled?: boolean;
  /** Standalone equivalent of AccordionGroup's prop: what an open item tints. Ignored inside a group, which decides for all its rows.
   *  @default "item" */
  readonly highlight?: "trigger" | "item";
  readonly children: ReactNode;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProperties>(
  (
    {
      value,
      index,
      disabled,
      highlight = "item",
      children,
      className,
      ...properties
    },
    reference
  ) => {
    const internalReference = useRef<HTMLDivElement>(null);
    const groupContext = useAccordionGroup();
    const standaloneOpen = useContext(StandaloneOpenContext);
    const shape = useShape();

    const isOpen = groupContext?.grouped
      ? groupContext.openValues.has(value)
      : standaloneOpen.has(value);

    const triggerReference = useRef<HTMLDivElement>(null);

    useRegisterFluidHoverItem(
      groupContext?.grouped ? groupContext.registerItem : undefined,
      index,
      triggerReference
    );

    useEffect(() => {
      if (!groupContext?.grouped || index === undefined) {
        return;
      }

      if (isOpen) {
        groupContext.registerFullItem(index, internalReference.current);
      } else {
        groupContext.registerFullItem(index, null);
      }
      return () => groupContext.registerFullItem(index, null);
    }, [index, groupContext, isOpen]);

    return (
      <AccordionItemContext.Provider
        value={{
          index,
          value,
          isOpen,
          triggerRef: triggerReference,
          highlight,
        }}
      >
        <AccordionPrimitive.Item
          value={value}
          disabled={disabled}
          render={(itemProperties) => {
            const restItem = omit(
              itemProperties as React.HTMLAttributes<HTMLDivElement>,
              ["style"]
            );
            return (
              <div
                {...restItem}
                ref={(node) => {
                  (
                    internalReference as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                  if (typeof reference === "function") {
                    reference(node);
                  } else if (reference) {
                    (
                      reference as React.MutableRefObject<HTMLDivElement | null>
                    ).current = node;
                  }
                }}
                data-fluid-hover-index={index}
                className={cn(!groupContext?.grouped && "relative", className)}
                {...properties}
              >
                {/* Standalone expanded background. Under the default
                    "trigger" choice the tint lives inside AccordionTrigger,
                    where it covers the row and not the panel below it. */}
                {!groupContext?.grouped && highlight === "item" && (
                  <AnimatePresence>
                    {isOpen ? (
                      <motion.div
                        className={`absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: spring.moderate.exit }}
                        transition={{ duration: 0.12 }}
                      />
                    ) : null}
                  </AnimatePresence>
                )}
                {children}
              </div>
            );
          }}
        />
      </AccordionItemContext.Provider>
    );
  }
);

AccordionItem.displayName = "AccordionItem";

// ─── AccordionTrigger ────────────────────────────────────────────────────────

interface AccordionTriggerProperties extends HTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
}

const AccordionTrigger = forwardRef<
  HTMLButtonElement,
  AccordionTriggerProperties
>(({ children, className, ...properties }, reference) => {
  const icons = useIcons();
  const ChevronRight = icons["chevron-right"];
  const groupContext = useAccordionGroup();
  const { index, isOpen, triggerRef, highlight } = useAccordionItemContext();
  const shape = useShape();
  const sizeClasses = useSize();
  const [isHovered, setIsHovered] = useState(false);

  const isActive = groupContext?.grouped
    ? groupContext.activeIndex === index
    : isHovered;

  const triggerContent = (
    // Render Header as a <div>. Base UI's Header defaults to <h3>, which
    // would be more semantic but breaks the ancestor selectors the styles
    // rely on.
    <AccordionPrimitive.Header render={<div />}>
      <AccordionPrimitive.Trigger
        ref={reference as React.Ref<HTMLElement>}
        className={cn(
          `relative z-10 flex items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} ${sizeClasses.variant === "compact" ? "py-1" : "py-2"} w-full cursor-pointer outline-none select-none`,
          !groupContext?.grouped &&
            "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0",
          className
        )}
        {...(properties as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {/* Label with dual-layer text */}
        <span className={cn("inline-grid flex-1 text-left", sizeClasses.text)}>
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
              isOpen || isActive ? "text-foreground" : "text-muted-foreground"
            )}
            style={{
              fontVariationSettings: isOpen
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {children}
          </span>
        </span>

        {/* Chevron */}
        <motion.span
          className="inline-flex shrink-0 items-center justify-center"
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={spring.fast}
        >
          <ChevronRight
            size={sizeClasses.icon}
            strokeWidth={isOpen || isActive ? 2 : 1.5}
            className={cn(
              "transition-[color,stroke-width] duration-80",
              isOpen || isActive ? "text-foreground" : "text-muted-foreground"
            )}
          />
        </motion.span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );

  if (groupContext?.grouped) {
    return <div ref={triggerRef}>{triggerContent}</div>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Open tint, scoped to this row: the panel below keeps the page's
            own surface, the way a sidebar row highlights without colouring
            its sub-tree. */}
      <AnimatePresence>
        {isOpen && highlight === "trigger" && isHovered ? (
          <motion.div
            className={`absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // The expanded tint rides the moderate tier, like the grouped
            // one — it marks a state, where the hover fill below tracks the
            // pointer and stays fast.
            exit={{ opacity: 0, transition: spring.moderate.exit }}
            transition={{ duration: 0.12 }}
          />
        ) : null}
      </AnimatePresence>
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
      {triggerContent}
    </div>
  );
});

AccordionTrigger.displayName = "AccordionTrigger";

// ─── AccordionContent ────────────────────────────────────────────────────────

interface AccordionContentProperties extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProperties>(
  ({ children, className, ...properties }, reference) => {
    const groupContext = useAccordionGroup();
    const { isOpen } = useAccordionItemContext();
    const sizeClasses = useSize();
    // Read here rather than relying on a MotionConfig the consumer may not
    // have: height is a positional value, so framer would otherwise animate
    // it for a reduced-motion user in any app that installs this component.
    const reduceMotion = useReducedMotion() ?? false;

    // The open height is animated to a self-measured LAYOUT pixel value, not
    // `height: "auto"`: framer resolves an "auto" target by measuring the
    // element's *visual* (transformed) size, so under a scaled ancestor
    // (e.g. /demo's 1.7x card) the animation overshoots to scale× the real
    // height and snaps back when the final "auto" lands — a visible height
    // reduction at the end of every open. offsetHeight and ResizeObserver
    // are transform-immune.
    const innerReference = useRef<HTMLDivElement | null>(null);
    const roReference = useRef<ResizeObserver | null>(null);
    const [contentHeight, setContentHeight] = useState<number | null>(null);
    // Height springs only when THIS panel toggles. When contentHeight
    // changes underneath it instead — anything collapsible nested inside
    // the panel, another accordion included — it must snap: a spring
    // re-targeted every frame chases the child's own animation, lands
    // after it, and drags everything below the item along late. Same rule
    // as SidebarGroup / SidebarMenuSub; see motion-guidelines.md.
    // Items open at mount render `initial: "auto"` and receive their first
    // pixel target a commit later. That hand-off is not a toggle, so it
    // snaps too — it must: framer would measure a spring's numeric start
    // visually (scaled) and play a shrink. Items that open later spring.
    const [previousOpen, setPreviousOpen] = useState(isOpen);
    const [toggling, setToggling] = useState(false);
    if (previousOpen !== isOpen) {
      setPreviousOpen(isOpen);
      setToggling(true);
    }

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
        isOpen &&
        innerReference.current &&
        innerReference.current.offsetHeight > 0
      ) {
        setContentHeight(innerReference.current.offsetHeight);
      }
    }, [isOpen]);

    // Whether the Motion height exit animation has fully finished.
    // Base UI's Panel would apply `hidden` the moment a controlled item
    // closes (useCollapsibleRoot sets `mounted = false` in a layout effect
    // when no CSS transition/animation is detected on the panel element, and
    // useCollapsiblePanel derives `hidden = !open && !mounted`) — which is
    // `display: none` and would freeze the exit animation mid-flight. So we
    // take over the `hidden` attribute below and only apply it once the exit
    // has actually completed.
    const [exitComplete, setExitComplete] = useState(!isOpen);
    if (isOpen && exitComplete) {
      // Reset during render so the panel is un-hidden before the opening
      // animation's first paint.
      setExitComplete(false);
    }

    // Render through `<AccordionPrimitive.Panel keepMounted>` so the panel
    // element persists through the exit animation and the trigger ↔ panel
    // ARIA contract stays intact: the panel carries `role="region"`,
    // `aria-labelledby` and the id that the Trigger's `aria-controls` points
    // to. The Motion height animation lives one level down inside the
    // persistent panel element and flips its target with `isOpen` (content
    // stays mounted so it can be measured).
    return (
      <AccordionPrimitive.Panel
        keepMounted
        render={(panelProperties) => {
          const restPanel = omit(
            panelProperties as React.HTMLAttributes<HTMLDivElement>,
            [
              // Applied too early for our exit animation (see above); we
              // control the attribute ourselves.
              "hidden",
              // Only carries the --accordion-panel-height/width vars, which
              // stay 'auto' since Base UI never measures JS-driven
              // animations; dropped for parity with the Root/Item render
              // props above.
              "style",
            ]
          );
          return (
            <div {...restPanel} hidden={!isOpen && exitComplete}>
              <motion.div
                ref={reference}
                className={cn("overflow-hidden", className)}
                initial={{ height: isOpen ? "auto" : 0 }}
                animate={{
                  height: isOpen ? (contentHeight ?? 0) : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                // spring.fast lands with the trigger's chevron, and its
                // bounce: 0 keeps pure height from overshooting its content.
                // A close is a decision already made, so it takes the quicker
                // exit tier — the target flip has no `exit` prop to carry it.
                // Opacity runs ahead of the height on its own timing: the
                // body dissolves rather than being sliced by the clip edge,
                // which is what stops the rows below reading as shoved.
                transition={
                  reduceMotion || !toggling
                    ? { duration: 0 }
                    : isOpen
                      ? { ...spring.fast, opacity: { duration: 0.06 } }
                      : { ...spring.fast.exit, opacity: { duration: 0.04 } }
                }
                onUpdate={() => {
                  groupContext?.remeasure();
                }}
                onAnimationComplete={() => {
                  setToggling(false);
                  groupContext?.remeasure();
                  if (!isOpen) {
                    setExitComplete(true);
                  }
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...(properties as any)}
              >
                <div
                  ref={measureReference}
                  className={cn(
                    "text-muted-foreground pt-1",
                    sizeClasses.px,
                    sizeClasses.text,
                    sizeClasses.variant === "compact" ? "pb-2.5" : "pb-3"
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
  }
);

AccordionContent.displayName = "AccordionContent";

export {
  Accordion,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
export default Accordion;

"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  forwardRef,
} from "react";
import { Tabs } from "@base-ui/react/tabs";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/springs";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { SizeProvider, useSize } from "@/lib/size-context";
import { useFluidHover } from "@/hooks/use-fluid-hover";
import type { SizeVariant } from "@/lib/size-context";
import type { ReactNode, HTMLAttributes } from "react";
import type { IconComponent } from "@/lib/icon-context";

interface TabsSubtleContextValue {
  registerTab: (index: number, element: HTMLElement | null) => void;
  hoveredIndex: number | null;
  selectedIndex: number;
  idPrefix: string | undefined;
  activeLabel: boolean;
}

const TabsSubtleContext = createContext<TabsSubtleContextValue | null>(null);

function useTabsSubtle() {
  const context = useContext(TabsSubtleContext);
  if (!context) {
    throw new Error("useTabsSubtle must be used within a TabsSubtle");
  }
  return context;
}

interface TabsSubtleProperties extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  readonly children: ReactNode;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly idPrefix?: string;
  /**
  When true, only the selected tab shows its text label. Requires icons on tabs.
  */
  readonly activeLabel?: boolean;
  /** Pins the tabs to one step of the size ladder (default 36px, compact
   *  28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  readonly size?: SizeVariant;
}

const TabsSubtle = forwardRef<HTMLDivElement, TabsSubtleProperties>(
  (
    {
      children,
      selectedIndex,
      onSelect,
      idPrefix,
      activeLabel = false,
      size,
      className,
      ...properties
    },
    reference
  ) => {
    const containerReference = useRef<HTMLDivElement>(null);
    // Whether the pointer is over the list: a ref for blur, which reads it at
    // the moment it runs, and the same flag as state for the render, which
    // picks the hover pill's exit from it. Both flip in the same handlers.
    const isMouseInside = useRef(false);
    const [mouseInside, setMouseInside] = useState(false);
    const shape = useShape();

    const {
      activeIndex: hoveredIndex,
      setActiveIndex: setHoveredIndex,
      itemRects: tabRects,
      handlers,
      registerItem,
      measureItems: measureTabs,
    } = useFluidHover(containerReference, { axis: "x" });

    // Track tab elements locally so we can observe their individual resizes
    const tabElementsReference = useRef(new Map<number, HTMLElement>());
    const registerTab = useCallback(
      (index: number, element: HTMLElement | null) => {
        registerItem(index, element);
        if (element) {
          tabElementsReference.current.set(index, element);
        } else {
          tabElementsReference.current.delete(index);
        }
      },
      [registerItem]
    );

    useEffect(() => {
      measureTabs();
    }, [measureTabs, children]);

    // Observe individual tab buttons for resize (label expand/collapse in activeLabel mode)
    useEffect(() => {
      const elements = tabElementsReference.current;
      if (elements.size === 0) {
        return;
      }
      const ro = new ResizeObserver(() => measureTabs());
      elements.forEach((element) => ro.observe(element));
      return () => ro.disconnect();
    }, [measureTabs, children]);

    // Wrap handlers to track isMouseInside
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        isMouseInside.current = true;
        setMouseInside(true);
        handlers.onMouseMove(e);
      },
      [handlers]
    );

    const handleMouseLeave = useCallback(() => {
      isMouseInside.current = false;
      setMouseInside(false);
      handlers.onMouseLeave();
    }, [handlers]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const selectedRect = tabRects[selectedIndex];
    const hoverRect = hoveredIndex === null ? null : tabRects[hoveredIndex];
    const focusRect = focusedIndex === null ? null : tabRects[focusedIndex];
    const isHoveringSelected = hoveredIndex === selectedIndex;
    const isHovering = hoveredIndex !== null && !isHoveringSelected;

    const root = (
      <TabsSubtleContext.Provider
        value={{
          registerTab,
          hoveredIndex,
          selectedIndex,
          idPrefix,
          activeLabel,
        }}
      >
        {/* Root is merged into List via `render` so a single <div> is emitted,
            matching the previous DOM structure. Base UI owns role="tablist",
            roving tabindex, and Arrow/Home/End keyboard navigation.
            `activateOnFocus={false}` keeps manual activation: arrows move
            focus, Enter/Space selects. */}
        <Tabs.Root
          value={selectedIndex}
          onValueChange={(value) => {
            if (typeof value === "number") {
              onSelect(value);
            }
          }}
          render={
            <Tabs.List
              activateOnFocus={false}
              ref={(node: HTMLDivElement | null) => {
                containerReference.current = node;
                if (typeof reference === "function") {
                  reference(node);
                } else if (reference) {
                  (
                    reference as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                const indexAttribute = (e.target as HTMLElement)
                  .closest("[data-fluid-hover-index]")
                  ?.getAttribute("data-fluid-hover-index");
                if (indexAttribute != null) {
                  const index = Number(indexAttribute);
                  setHoveredIndex(index);
                  setFocusedIndex(
                    (e.target as HTMLElement).matches(":focus-visible")
                      ? index
                      : null
                  );
                }
              }}
              onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
                if (
                  containerReference.current?.contains(e.relatedTarget as Node)
                ) {
                  return;
                }
                setFocusedIndex(null);
                if (isMouseInside.current) {
                  return;
                }
                setHoveredIndex(null);
              }}
              className={cn(
                // -mx-1 px-1 / -my-1 py-1 give the 2px-outset focus ring room
                // to draw without being clipped by overflow-x-auto. The
                // max-width allows for the negative margins: fit-content
                // parents size against the margin box (8px narrower than the
                // border box), so a plain max-w-full would clamp the list 8px
                // too small and clip the first/last tab's ring.
                "scrollbar-hide relative -mx-1 -my-1 flex max-w-[calc(100%_+_8px)] items-center overflow-x-auto px-1 py-1 select-none",
                className
              )}
              {...properties}
            >
              {/* Selected pill */}
              {selectedRect ? (
                <motion.div
                  className={cn(
                    "bg-active pointer-events-none absolute",
                    shape.bg
                  )}
                  initial={false}
                  animate={{
                    left: selectedRect.left,
                    width: selectedRect.width,
                    top: selectedRect.top,
                    height: selectedRect.height,
                    opacity: isHovering ? 0.8 : 1,
                  }}
                  transition={{
                    ...spring.moderate,
                    opacity: { duration: 0.08 },
                  }}
                />
              ) : null}

              {/* Hover pill */}
              <AnimatePresence>
                {hoverRect && !isHoveringSelected && selectedRect ? (
                  <motion.div
                    className={cn(
                      "bg-active pointer-events-none absolute",
                      shape.bg
                    )}
                    initial={{
                      left: selectedRect.left,
                      width: selectedRect.width,
                      top: selectedRect.top,
                      height: selectedRect.height,
                      opacity: 0,
                    }}
                    animate={{
                      left: hoverRect.left,
                      width: hoverRect.width,
                      top: hoverRect.top,
                      height: hoverRect.height,
                      opacity: 0.4,
                    }}
                    exit={
                      !mouseInside && selectedRect
                        ? {
                            left: selectedRect.left,
                            width: selectedRect.width,
                            top: selectedRect.top,
                            height: selectedRect.height,
                            opacity: 0,
                            transition: {
                              ...spring.moderate,
                              opacity: { duration: 0.06 },
                            },
                          }
                        : { opacity: 0, transition: spring.fast.exit }
                    }
                    transition={{
                      ...spring.fast,
                      opacity: { duration: 0.08 },
                    }}
                  />
                ) : null}
              </AnimatePresence>

              {/* Focus ring */}
              <AnimatePresence>
                {focusRect ? (
                  <motion.div
                    className={cn(
                      "pointer-events-none absolute z-20 border border-[color:var(--focus-ring,#6B97FF)]",
                      shape.focusRing
                    )}
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
            </Tabs.List>
          }
        />
      </TabsSubtleContext.Provider>
    );

    // A size prop pins every tab to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
);

TabsSubtle.displayName = "TabsSubtle";

interface TabsSubtleItemProperties extends HTMLAttributes<HTMLButtonElement> {
  readonly icon?: IconComponent;
  readonly label: string;
  readonly index: number;
}

const TabsSubtleItem = forwardRef<HTMLButtonElement, TabsSubtleItemProperties>(
  ({ icon: Icon, label, index, className, ...properties }, reference) => {
    const internalReference = useRef<HTMLButtonElement | null>(null);
    // The collapsing label animates to a MEASURED layout width, not "auto":
    // framer resolves an "auto" target from the element's *visual*
    // (transformed) size, so under a scaled ancestor (e.g. /demo's card) the
    // spring overshoots to scale-x the real width and snaps when "auto"
    // lands. offsetWidth and ResizeObserver are transform-immune — same
    // setup as the accordions' height animation.
    const [labelWidth, setLabelWidth] = useState<number | null>(null);
    const labelRoReference = useRef<ResizeObserver | null>(null);
    const measureLabel = useCallback((element: HTMLSpanElement | null) => {
      labelRoReference.current?.disconnect();
      labelRoReference.current = null;
      if (!element) {
        return;
      }
      const update = () => setLabelWidth(element.offsetWidth);
      update();
      labelRoReference.current = new ResizeObserver(update);
      labelRoReference.current.observe(element);
    }, []);
    const shape = useShape();
    const sizeClasses = useSize();
    const { registerTab, hoveredIndex, selectedIndex, idPrefix, activeLabel } =
      useTabsSubtle();

    useEffect(() => {
      registerTab(index, internalReference.current);
      return () => registerTab(index, null);
    }, [index, registerTab]);

    const isSelected = selectedIndex === index;
    const isActive = hoveredIndex === index || isSelected;
    const collapseLabel = activeLabel && !!Icon;
    const isShowLabel = !collapseLabel || isSelected;

    const labelContent = (
      // Both stacked spans carry the text-box trim so the invisible bold
      // sizer and the visible label keep identical boxes.
      <span
        ref={measureLabel}
        className={cn("inline-grid whitespace-nowrap", sizeClasses.text)}
      >
        <span
          className="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
          style={{ fontVariationSettings: fontWeights.semibold }}
          aria-hidden="true"
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
          style={{
            fontVariationSettings: isSelected
              ? fontWeights.semibold
              : fontWeights.normal,
          }}
        >
          {label}
        </span>
      </span>
    );

    return (
      // Base UI Tab renders a native <button type="button"> and wires
      // role="tab", aria-selected, roving tabindex, and activation for us.
      // id/aria-controls are only overridden when an idPrefix is supplied so
      // externally rendered TabsSubtlePanel elements stay linked.
      <Tabs.Tab
        ref={(node: HTMLElement | null) => {
          const button = node as HTMLButtonElement | null;
          internalReference.current = button;
          if (typeof reference === "function") {
            reference(button);
          } else if (reference) {
            (
              reference as React.MutableRefObject<HTMLButtonElement | null>
            ).current = button;
          }
        }}
        value={index}
        data-fluid-hover-index={index}
        id={idPrefix ? `${idPrefix}-tab-${index}` : undefined}
        aria-controls={idPrefix ? `${idPrefix}-panel-${index}` : undefined}
        aria-label={collapseLabel && !isShowLabel ? label : undefined}
        className={cn(
          // Fixed heights (was py-2 around a 19.5px line box ≈ 35.5px) so the
          // text-box trim on the label doesn't shrink the tab. Standalone
          // pills sit directly on the ladder's control height.
          "relative z-10 flex cursor-pointer items-center border-none bg-transparent outline-none",
          sizeClasses.control,
          sizeClasses.px,
          !collapseLabel && sizeClasses.gap,
          shape.bg,
          className
        )}
        {...properties}
      >
        {Icon ? (
          <Icon
            size={sizeClasses.icon}
            strokeWidth={isActive ? 2 : 1.5}
            className={cn(
              "shrink-0 transition-[color,stroke-width] duration-80",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          />
        ) : null}
        {collapseLabel ? (
          <AnimatePresence initial={false}>
            {isShowLabel ? (
              <motion.span
                key="label"
                className="overflow-hidden"
                // Until the measurement lands, let CSS resolve the width
                // instead of handing framer "auto": framer resolves an "auto"
                // target from the element's *visual* size, so under a scaled
                // ancestor (the /demo card, ~1.76x) it writes back a layout
                // width that much too wide, then springs back down when the
                // measured value arrives — the selected tab visibly pulses on
                // arrival. Plain CSS auto is the true layout width, and the
                // measured number that follows matches it exactly.
                style={labelWidth == null ? { width: "auto" } : undefined}
                initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                animate={{
                  ...(labelWidth != null && { width: labelWidth }),
                  opacity: 1,
                  // 8px matches the ladder's icon-to-label gap (gap-2); the
                  // compact 6px is its own value, 2px wider than gap-1.
                  marginLeft: sizeClasses.variant === "compact" ? 6 : 8,
                }}
                exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                transition={{
                  ...spring.fast,
                  opacity: { duration: 0.06 },
                }}
              >
                {labelContent}
              </motion.span>
            ) : null}
          </AnimatePresence>
        ) : (
          labelContent
        )}
      </Tabs.Tab>
    );
  }
);

TabsSubtleItem.displayName = "TabsSubtleItem";

interface TabsSubtlePanelProperties extends HTMLAttributes<HTMLDivElement> {
  readonly index: number;
  readonly selectedIndex: number;
  readonly idPrefix: string;
  readonly children: ReactNode;
}

// Rendered outside <TabsSubtle> at every call site, so it cannot use Base UI's
// Tabs.Panel (which requires the Tabs.Root context). It stays a plain tabpanel
// linked to its tab through the shared idPrefix.
const TabsSubtlePanel = forwardRef<HTMLDivElement, TabsSubtlePanelProperties>(
  (
    { index, selectedIndex, idPrefix, children, className, ...properties },
    reference
  ) => {
    const isSelected = selectedIndex === index;

    return (
      <div
        ref={reference}
        id={`${idPrefix}-panel-${index}`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${index}`}
        hidden={!isSelected}
        tabIndex={-1}
        className={cn("outline-none", className)}
        {...properties}
      >
        {isSelected ? children : null}
      </div>
    );
  }
);

TabsSubtlePanel.displayName = "TabsSubtlePanel";

export { TabsSubtle, TabsSubtleItem, TabsSubtlePanel };
export default TabsSubtle;

"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  createContext,
  useContext,
  forwardRef,
  Children,
  cloneElement,
  isValidElement,
} from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/springs";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { SizeProvider, useSize } from "@/lib/size-context";
import { useSurface } from "@/lib/surface-context";
import { surfaceClasses } from "@/lib/surface-classes";
import { useFluidHover } from "@/hooks/use-fluid-hover";
import type { SizeVariant } from "@/lib/size-context";
import type { ComponentPropsWithoutRef } from "react";
import type { IconComponent } from "@/lib/icon-context";

// ---------------------------------------------------------------------------
// Tabs is a segmented control: a muted track (TabsList) holding one raised
// pill for the selected tab, a faint hover pill that previews the next click,
// and a focus ring for the keyboard. All three are absolutely positioned
// layers that travel across the tab rects measured by useFluidHover; the tabs
// themselves stay transparent. Selection moves on spring.moderate, hover and
// focus on spring.fast, and labels change weight without shifting layout.
// ---------------------------------------------------------------------------

/*
─────────────────────── Contexts ───────────────────────
*/

interface TabsValueOrderContextValue {
  valueOrder: string[];
  setValueOrder: (order: string[]) => void;
  selectedValue: string | undefined;
}

const TabsValueOrderContext = createContext<TabsValueOrderContextValue | null>(
  null
);

interface TabsListContextValue {
  registerTab: (
    index: number,
    value: string,
    element: HTMLElement | null
  ) => void;
  hoveredIndex: number | null;
  selectedValue: string | undefined;
  /**
  Optimistically set selectedIdx so the indicator moves immediately on click.
  */
  setOptimisticIdx: (index: number) => void;
}

const TabsListContext = createContext<TabsListContextValue | null>(null);

function useTabsList() {
  const context = useContext(TabsListContext);
  if (!context) {
    throw new Error("TabItem must be used within a TabsList");
  }
  return context;
}

/*
─────────────────────── Tabs (Root) ───────────────────────
*/

interface TabsProperties extends Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
  "onValueChange" | "value" | "defaultValue" | "onSelect"
> {
  /**
  Controlled value (takes precedence over selectedIndex).
  */
  readonly value?: string;
  /**
  Called when the active tab changes.
  */
  readonly onValueChange?: (value: string) => void;
  /**
  Index-based controlled alternative.
  */
  readonly selectedIndex?: number;
  /**
  Called with the new index when the active tab changes.
  */
  readonly onSelect?: (index: number) => void;
  readonly defaultValue?: string;
  /** Pins the segmented control to one step of the size ladder (default 36px
   *  outer, compact 28px). Omitted, it follows the
   *  surrounding SizeProvider. */
  readonly size?: SizeVariant;
}

const Tabs = forwardRef<HTMLDivElement, TabsProperties>(
  (
    {
      value,
      onValueChange,
      selectedIndex,
      onSelect,
      defaultValue,
      size,
      children,
      ...properties
    },
    reference
  ) => {
    const [valueOrder, setValueOrder] = useState<string[]>([]);
    const [uncontrolledValue, setUncontrolledValue] = useState<
      string | undefined
    >(defaultValue);
    // Keep the current array when the order is unchanged: React then bails
    // out of the update, so a TabsList re-reporting the same tabs (a remount,
    // Strict Mode's double effects) doesn't re-render the whole root.
    const updateValueOrder = useCallback((order: string[]) => {
      setValueOrder((current) => {
        return current.length === order.length &&
          current.every((v, i) => v === order[i])
          ? current
          : order;
      });
    }, []);

    // Resolve value: explicit value > selectedIndex lookup > uncontrolled state.
    // Uncontrolled with no defaultValue falls back to the first tab so the
    // FF layer's selectedValue matches what the primitive shows.
    const resolvedValue =
      value ??
      (selectedIndex == null
        ? (uncontrolledValue ?? valueOrder[0])
        : valueOrder[selectedIndex]);

    // Base UI passes (value, eventDetails); we only need value.
    const handleValueChange = useCallback(
      (newValue: unknown) => {
        const v = newValue as string;
        // Local state only backs uncontrolled use. With value or selectedIndex
        // the parent owns selection, so this just reports the change, by value
        // and by index.
        if (value === undefined && selectedIndex == null) {
          setUncontrolledValue(v);
        }
        onValueChange?.(v);
        if (onSelect) {
          const index = valueOrder.indexOf(v);
          if (index !== -1) {
            onSelect(index);
          }
        }
      },
      [onValueChange, onSelect, valueOrder, value, selectedIndex]
    );

    const root = (
      <TabsValueOrderContext.Provider
        value={{
          valueOrder,
          setValueOrder: updateValueOrder,
          selectedValue: resolvedValue,
        }}
      >
        {/*
          Always controlled: Base UI's useControlled logs a dev warning when
          value flips undefined → defined. valueOrder is empty on the first
          commit, so fall back to an empty-string sentinel — TabsList's
          layout effect populates valueOrder pre-paint, so the corrected
          value lands before anything is visible.
        */}
        <TabsPrimitive.Root
          ref={reference}
          value={resolvedValue ?? ""}
          onValueChange={handleValueChange}
          {...properties}
        >
          {children}
        </TabsPrimitive.Root>
      </TabsValueOrderContext.Provider>
    );

    // A size prop pins the whole compound (list + items) to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
);

Tabs.displayName = "Tabs";

/*
─────────────────────── TabsList ───────────────────────
*/

type TabsListProperties = ComponentPropsWithoutRef<typeof TabsPrimitive.List>;

const TabsList = forwardRef<HTMLDivElement, TabsListProperties>(
  ({ children, className, ...properties }, reference) => {
    const containerReference = useRef<HTMLDivElement>(null);
    // Whether the pointer is over the list: a ref for blur, which reads it at
    // the moment it runs, and the same flag as state for the render, which
    // picks the hover pill's exit from it. Both flip in the same handlers.
    const isMouseInside = useRef(false);
    const [mouseInside, setMouseInside] = useState(false);
    const shape = useShape();
    const sizeClasses = useSize();
    const substrate = useSurface();
    // Active pill lifts 3 levels above substrate (1 above the muted track + 2 for pop).
    // On the page (substrate 1) this lands on surface 4, the original design.
    // Inside a dialog (substrate 5) it lifts to surface 8 instead of staying at 4.
    const indicatorLevel = Math.min(substrate + 3, 8);
    const valueOrderContext = useContext(TabsValueOrderContext);

    // Derive value order from children synchronously
    const values = Children.toArray(children)
      .filter(isValidElement)
      .map((child) => (child.props as { value?: string }).value)
      .filter((v): v is string => typeof v === "string");
    // `values` is a new array every render; the serialized key is what the
    // layout effect compares, so it only re-reports on a real change.
    const valueOrderKey = JSON.stringify(values);
    const setValueOrder = valueOrderContext?.setValueOrder;

    // Report value order up to Tabs root
    useLayoutEffect(() => {
      setValueOrder?.(JSON.parse(valueOrderKey) as string[]);
    }, [setValueOrder, valueOrderKey]);

    // Fluid hover
    // axis "x": the tab nearest the cursor horizontally wins, so the list's
    // padding never leaves the hover pill without a target.
    const {
      activeIndex: hoveredIndex,
      setActiveIndex: setHoveredIndex,
      itemRects,
      handlers,
      registerItem,
      measureItems,
    } = useFluidHover(containerReference, { axis: "x" });

    // Register items: bridge from (index, value, el) → registerItem(index, el)
    const registerTab = useCallback(
      (index: number, _value: string, element: HTMLElement | null) => {
        registerItem(index, element);
      },
      [registerItem]
    );

    // Measure on children change (resizes are covered by useFluidHover's
    // own container ResizeObserver)
    useEffect(() => {
      measureItems();
    }, [measureItems, children]);

    // Track mouse inside
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        isMouseInside.current = true;
        setMouseInside(true);
        handlers.onMouseMove(e);
      },
      [handlers]
    );

    // Flip the flag before clearing the hover index: the hover pill's exit is
    // chosen from it, sliding back into the selected pill or fading in place.
    const handleMouseLeave = useCallback(() => {
      isMouseInside.current = false;
      setMouseInside(false);
      handlers.onMouseLeave();
    }, [handlers]);

    // Focus ring
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const selectedValue = valueOrderContext?.selectedValue;
    const selectedIndex =
      selectedValue === undefined ? -1 : values.indexOf(selectedValue);

    // The pills follow optimisticIdx, not selectedIdx. A click sets it at once,
    // so the pill moves before controlled state round-trips; it is then
    // resynced, during render, whenever the resolved selection changes (arrow
    // keys, a parent). The first render syncs too: syncedIdx starts unset.
    const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
    const [syncedIndex, setSyncedIndex] = useState<number | undefined>(
      undefined
    );
    if (syncedIndex !== selectedIndex) {
      setSyncedIndex(selectedIndex);
      setOptimisticIndex(selectedIndex >= 0 ? selectedIndex : null);
    }

    const activeSelectedIndex = optimisticIndex;
    const selectedRect =
      activeSelectedIndex === null ? null : itemRects[activeSelectedIndex];
    const hoverRect = hoveredIndex === null ? null : itemRects[hoveredIndex];
    const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];
    // Hovering the selected tab needs no hover pill (the active pill is already
    // there); hovering any other tab shows one and dims the active pill.
    const isHoveringSelected = hoveredIndex === activeSelectedIndex;
    const isHovering = hoveredIndex !== null && !isHoveringSelected;

    // Auto-assign _index to children.
    // Skip plain DOM elements: injecting _index into e.g. a <div>
    // triggers React's unknown-prop warning.
    const indexedChildren = Children.map(children, (child, index) =>
      isValidElement(child) && typeof child.type !== "string"
        ? cloneElement(child, { _index: index } as Record<string, unknown>)
        : child
    );

    return (
      <TabsListContext.Provider
        value={{
          registerTab,
          hoveredIndex,
          selectedValue,
          setOptimisticIdx: setOptimisticIndex,
        }}
      >
        <TabsPrimitive.List
          // Arrow keys move focus and select in one step, so the pill follows
          // the keyboard the same way it follows a click.
          activateOnFocus
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
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          // Focus also sets the hover index, so keyboard and mouse share one
          // highlight state. The ring draws only when the tab matches
          // :focus-visible, so a mouse click (which focuses too) shows none.
          onFocus={(e) => {
            const trigger = (e.target as HTMLElement).closest('[role="tab"]');
            if (!trigger) {
              return;
            }
            const indexAttribute = trigger.getAttribute(
              "data-fluid-hover-index"
            );
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
          // Focus moving between tabs stays inside the list and is ignored.
          // Leaving the list drops the ring, but the hover highlight stays
          // while the mouse still rests on a tab.
          onBlur={(e) => {
            if (containerReference.current?.contains(e.relatedTarget as Node)) {
              return;
            }
            setFocusedIndex(null);
            if (isMouseInside.current) {
              return;
            }
            setHoveredIndex(null);
          }}
          className={cn(
            // segmentPad + segmentItem add up to the ladder's control height
            // (36px default, 28px compact) so the segmented control's outer
            // box lines up with buttons, selects, and inputs beside it.
            "bg-muted relative inline-flex items-center select-none",
            sizeClasses.segmentPad,
            shape.container,
            className
          )}
          {...properties}
        >
          {/* Active segment indicator */}
          {selectedRect ? (
            <motion.div
              className={cn(
                "pointer-events-none absolute",
                // A raised surface (background + shadow), not a tint, so the
                // selected tab lifts off the muted track.
                surfaceClasses(indicatorLevel),
                shape.bg
              )}
              initial={false}
              animate={{
                left: selectedRect.left,
                width: selectedRect.width,
                top: selectedRect.top,
                height: selectedRect.height,
                // Dims to 0.85 while another tab is hovered: the selection
                // reads as "current" and the hover pill as "next".
                opacity: isHovering ? 0.85 : 1,
              }}
              // The selection travels on spring.moderate and lands without
              // overshoot; the dim is a plain 80ms fade.
              transition={{
                ...spring.moderate,
                opacity: { duration: 0.08 },
              }}
            />
          ) : null}

          {/* Hover indicator */}
          <AnimatePresence>
            {/* Born at the selected pill (opacity 0) and sliding out to the
                hovered tab, so the preview reads as leaving the current
                choice. Without a selected pill there is nowhere to start. */}
            {hoverRect && !isHoveringSelected && selectedRect ? (
              <motion.div
                className={cn(
                  "bg-hover pointer-events-none absolute",
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
                  // bg-hover at 0.4 stays well below the active pill.
                  opacity: 0.4,
                }}
                // With the mouse outside the list, slide back into the selected
                // pill on spring.moderate while fading over 60ms. With it still
                // inside (now over the selected tab), fade where it is.
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
                // spring.fast so the preview keeps up with the cursor.
                transition={{
                  ...spring.fast,
                  opacity: { duration: 0.08 },
                }}
              />
            ) : null}
          </AnimatePresence>

          {/* Focus ring */}
          <AnimatePresence>
            {/* One ring for the whole list that springs between tabs, drawn
                2px outside the focused tab's rect and above the tabs (z-20).
                The #6B97FF fallback keeps it visible without the token. */}
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

          {indexedChildren}
        </TabsPrimitive.List>
      </TabsListContext.Provider>
    );
  }
);

TabsList.displayName = "TabsList";

/*
─────────────────────── TabItem ───────────────────────
*/

interface TabItemProperties extends ComponentPropsWithoutRef<
  typeof TabsPrimitive.Tab
> {
  /**
  Unique value for this tab.
  */
  readonly value: string;
  /**
  Optional leading icon.
  */
  readonly icon?: IconComponent;
  /**
  Text label.
  */
  readonly label: string;
  /**
  @internal
  */
  readonly _index?: number;
}

const TabItem = forwardRef<HTMLButtonElement, TabItemProperties>(
  (
    { value, icon: Icon, label, _index = 0, className, onClick, ...properties },
    reference
  ) => {
    const internalReference = useRef<HTMLButtonElement>(null);
    const sizeClasses = useSize();
    const { registerTab, hoveredIndex, selectedValue, setOptimisticIdx } =
      useTabsList();

    // Register the button so the list can measure its rect; the cleanup
    // unregisters it so no pill aims at a tab that has gone.
    useEffect(() => {
      registerTab(_index, value, internalReference.current);
      return () => registerTab(_index, value, null);
    }, [_index, value, registerTab]);

    const isSelected = selectedValue === value;
    // Hover or selection brightens color and icon stroke; only selection
    // changes weight, so hovering never thickens a label.
    const isActive = hoveredIndex === _index || isSelected;

    return (
      <TabsPrimitive.Tab
        // Composed (not spread-overridable): a consumer onClick must not
        // replace the optimistic indicator jump.
        onClick={(e) => {
          setOptimisticIdx(_index);
          onClick?.(e);
        }}
        ref={(node) => {
          (
            internalReference as React.MutableRefObject<HTMLElement | null>
          ).current = node as HTMLButtonElement | null;
          if (typeof reference === "function") {
            reference(node as HTMLButtonElement);
          } else if (reference) {
            (
              reference as React.MutableRefObject<HTMLButtonElement | null>
            ).current = node as HTMLButtonElement | null;
          }
        }}
        value={value}
        // Read back by the list's onFocus to map a focused tab to its index.
        data-fluid-hover-index={_index}
        className={cn(
          // outline-none: the list draws one shared focus ring instead.
          // Fixed height (not py) so the text-box trim below doesn't shrink
          // the tab — browsers without text-box support render identically.
          "relative z-10 flex cursor-pointer items-center border-none bg-transparent px-3 outline-none",
          sizeClasses.segmentItem,
          sizeClasses.gap,
          className
        )}
        {...properties}
      >
        {/* Stroke 1.5 → 2 and muted → foreground on hover or selection, over
            the label's 80ms, so icon and text change together. */}
        {Icon ? (
          <Icon
            size={sizeClasses.icon}
            strokeWidth={isActive ? 2 : 1.5}
            className={cn(
              "transition-[color,stroke-width] duration-80",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          />
        ) : null}
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
        <span className={cn("inline-grid whitespace-nowrap", sizeClasses.text)}>
          {/* Invisible semibold copy: reserves the bold width up front, so the
              tab doesn't widen when selected and the pills don't jump. */}
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
            // Semibold only when selected, via wght + opsz so the width barely
            // moves; the sizer above absorbs what remains.
            style={{
              fontVariationSettings: isSelected
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {label}
          </span>
        </span>
      </TabsPrimitive.Tab>
    );
  }
);

TabItem.displayName = "TabItem";

/*
─────────────────────── TabPanel ───────────────────────
*/

interface TabPanelProperties extends ComponentPropsWithoutRef<
  typeof TabsPrimitive.Panel
> {
  /**
  Must match a TabItem value.
  */
  readonly value: string;
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProperties>(
  ({ className, ...properties }, reference) => {
    return (
      <TabsPrimitive.Panel
        ref={reference}
        className={cn("outline-none", className)}
        {...properties}
      />
    );
  }
);

TabPanel.displayName = "TabPanel";

/*
─────────────────────── Exports ───────────────────────
*/

export { Tabs, TabsList, TabItem, TabPanel };
export type {
  TabsProperties as TabsProps,
  TabsListProperties as TabsListProps,
  TabItemProperties as TabItemProps,
  TabPanelProperties as TabPanelProps,
};

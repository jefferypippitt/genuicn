"use client";

import {
  Children,
  useRef,
  useState,
  createContext,
  useContext,
  forwardRef,
  isValidElement,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/springs";
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

// ---------------------------------------------------------------------------
// RadioGroup is a vertical list of RadioItem rows sharing one fluid hover
// scope. The group paints everything that spans rows: one selected background
// that springs from the old row to the new one, the hover highlight, and one
// focus ring that springs between rows. Each row is the focusable
// role="radio" element. Selection takes one of three APIs: `value` +
// `onValueChange` on the group, `selectedIndex` on the group, or `selected` +
// `onSelect` per item.
// ---------------------------------------------------------------------------

// True only while a row's mousedown handler moves focus onto the row. Chrome
// reports a focus() call from script as :focus-visible, so without this flag
// every click would draw the keyboard focus ring. focus() fires its focus
// events synchronously, so the flag never outlives that one call.
let isPointerFocusRedirect = false;

interface RadioGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  selectedIndex: number | null;
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  /**
  Whether any item in the group is currently selected. Drives the roving tabindex fallback: with no selection, the first item must stay tabbable or the whole group becomes unreachable by keyboard.
  */
  hasSelection: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error("useRadioGroup must be used within a RadioGroup");
  }
  return context;
}

interface RadioGroupProperties extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  readonly children: ReactNode;
  readonly selectedIndex?: number;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, it follows the surrounding
   *  SizeProvider. */
  readonly size?: SizeVariant;
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProperties>(
  (
    {
      children,
      selectedIndex,
      value,
      onValueChange,
      size,
      className,
      ...properties
    },
    reference
  ) => {
    const containerReference = useRef<HTMLDivElement>(null);
    // Each child's `value`, in order, so a `value`-controlled group can find
    // the row index its selected background sits on.
    const childValues = Children.toArray(children)
      .filter(isValidElement)
      .map((child) => (child.props as { value?: string }).value);
    const hover = useFluidHover(containerReference);
    const { activeIndex, setActiveIndex, itemRects, handlers, registerItem } =
      hover;

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    // -1 when nothing matches, which hides the selected background.
    const resolvedSelectedIndex =
      value === undefined ? (selectedIndex ?? -1) : childValues.indexOf(value);
    // Covers all three selection APIs: value, selectedIndex, per-item selected.
    const hasSelection =
      resolvedSelectedIndex >= 0 ||
      Children.toArray(children)
        .filter(isValidElement)
        .some(
          (child) => (child.props as { selected?: boolean }).selected === true
        );

    const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];
    const selectedRect =
      resolvedSelectedIndex >= 0 ? itemRects[resolvedSelectedIndex] : null;
    const shape = useShape();

    const content = (
      <div
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
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        onClick={handlers.onClick}
        // Focus drives the same activeIndex as hover, so the highlight, the
        // border and the label color follow the keyboard too. The focus ring
        // shows for keyboard focus only, never after a click.
        onFocus={(e) => {
          const indexAttribute = (e.target as HTMLElement)
            .closest("[data-fluid-hover-index]")
            ?.getAttribute("data-fluid-hover-index");
          if (indexAttribute != null) {
            const index = Number(indexAttribute);
            setActiveIndex(index);
            // A row focused by its own mousedown gets no ring, even though
            // the browser reports that focus as :focus-visible.
            setFocusedIndex(
              !isPointerFocusRedirect &&
                (e.target as HTMLElement).matches(":focus-visible")
                ? index
                : null
            );
          }
        }}
        onBlur={(e) => {
          // Don't clear hover when focus moves to another item within the group
          if (containerReference.current?.contains(e.relatedTarget as Node)) {
            return;
          }
          setFocusedIndex(null);
          setActiveIndex(null);
        }}
        onKeyDown={(e) => {
          // Scope to row wrappers only. The hidden radio primitive also
          // carries role="radio", so a bare [role="radio"] selector matches
          // twice per row and arrows land on the invisible control.
          const items = [
            ...(containerReference.current?.querySelectorAll(
              "[data-fluid-hover-index]"
            ) ?? []),
          ] as HTMLElement[];
          const currentIndex = items.indexOf(e.target as HTMLElement);
          if (currentIndex === -1) {
            return;
          }

          // In value mode this handler is merged with Base UI RadioGroup's
          // composite onto the same element; suppress the composite's own
          // roving focus (it targets the hidden sr-only radios).
          const preventBaseUI = (
            e as unknown as { preventBaseUIHandler?: () => void }
          ).preventBaseUIHandler;

          // All four arrows move focus AND select, as native radios do, wrapping at both ends; Home/End jump to the first or last row and select it.
          // Selecting goes through the row's click, so it runs the same handler
          // as a pointer press.
          if (
            ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)
          ) {
            e.preventDefault();
            preventBaseUI?.();
            const next =
              (["ArrowDown", "ArrowRight"].includes(e.key)
                ? currentIndex + 1
                : currentIndex - 1 + items.length) % items.length;
            items[next].focus();
            items[next].click();
          } else if (e.key === "Home") {
            e.preventDefault();
            preventBaseUI?.();
            items[0]?.focus();
            items[0]?.click();
          } else if (e.key === "End") {
            e.preventDefault();
            preventBaseUI?.();
            items.at(-1)?.focus();
            items.at(-1)?.click();
          }
        }}
        role="radiogroup"
        // select-none keeps rapid clicks on rows from selecting the label text.
        className={cn(
          "relative flex w-72 max-w-full flex-col select-none",
          className
        )}
        {...properties}
      >
        {/* Selected background */}
        {/* One shared background springs (spring.moderate) from the old row to
            the new one instead of each row fading its own in and out.
            initial={false} places it without animating on first render. */}
        {selectedRect ? (
          <motion.div
            className={`absolute ${shape.bg} bg-active pointer-events-none`}
            initial={false}
            animate={{
              top: selectedRect.top,
              left: selectedRect.left,
              width: selectedRect.width,
              height: selectedRect.height,
              opacity: 1,
            }}
            transition={{
              ...spring.moderate,
              opacity: { duration: 0.08 },
            }}
          />
        ) : null}

        {/* Hover background */}
        <FluidHoverHighlight hover={hover} className={shape.bg} />

        {/* Focus ring */}
        {/* One shared ring springs between rows on spring.fast. It sits 2px
            outside the row and shape.focusRing is the row radius + 2px, so
            the corners stay concentric; z-20 lifts it above the rows. */}
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

    // If `value` is provided (controlled-by-value mode), always wrap with the
    // Base UI RadioGroup primitive — even when `onValueChange` is absent. The
    // inner `<RadioPrimitive.Root>` rendered by each RadioItem requires a
    // parent RadioGroup context; without it, Base UI crashes on context reads.
    // The wrapper just doesn't forward changes when the consumer doesn't ask to be notified.
    // A size prop pins every row in the group to one ladder step.
    const withSize = (node: ReactNode) =>
      size ? <SizeProvider size={size}>{node}</SizeProvider> : node;

    if (value !== undefined) {
      return withSize(
        <RadioGroupContext.Provider
          value={{
            registerItem,
            activeIndex,
            selectedIndex:
              resolvedSelectedIndex >= 0 ? resolvedSelectedIndex : null,
            selectedValue: value,
            onValueChange,
            hasSelection,
          }}
        >
          {/* render merges the primitive's props and handlers onto the
              container itself, so no wrapper div sits between the group and
              its rows. */}
          <RadioGroupPrimitive
            value={value}
            onValueChange={(v) => onValueChange?.(v as string)}
            render={content}
          />
        </RadioGroupContext.Provider>
      );
    }

    return withSize(
      <RadioGroupContext.Provider
        value={{
          registerItem,
          activeIndex,
          selectedIndex: selectedIndex ?? null,
          hasSelection,
        }}
      >
        {content}
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

interface RadioItemProperties extends HTMLAttributes<HTMLDivElement> {
  readonly label: string;
  readonly index: number;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly value?: string;
}

const RadioItem = forwardRef<HTMLDivElement, RadioItemProperties>(
  (
    { label, index, selected, onSelect, value, className, ...properties },
    reference
  ) => {
    const internalReference = useRef<HTMLDivElement>(null);
    const {
      registerItem,
      activeIndex,
      selectedIndex,
      selectedValue,
      onValueChange,
      hasSelection,
    } = useRadioGroupContext();

    useRegisterFluidHoverItem(registerItem, index, internalReference);

    const isActive = activeIndex === index;
    const shape = useShape();
    const sizeClasses = useSize();
    const isCompact = sizeClasses.variant === "compact";
    // Value equality decides when both the item and the group have a value;
    // otherwise the item's own `selected` wins over the group's selectedIndex.
    const isSelected =
      value !== undefined && selectedValue !== undefined
        ? selectedValue === value
        : (selected ?? selectedIndex === index);

    // Value mode reports through the group's onValueChange, index and per-item
    // modes through onSelect; both fire when both are wired.
    const handleSelect = () => {
      if (value !== undefined) {
        onValueChange?.(value);
      }
      onSelect?.();
    };

    return (
      <div
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
        // Roving tabindex: selected item is the tab stop; with no selection the
        // first item takes it so the group stays keyboard-reachable.
        tabIndex={isSelected || (!hasSelection && index === 0) ? 0 : -1}
        // The row, not the primitive, carries the role, state and name: it is
        // the element that takes focus.
        role="radio"
        aria-checked={isSelected}
        aria-label={label}
        onClick={handleSelect}
        onMouseDown={(e) => {
          // Pin focus to the row wrapper on press: the group keydown handler
          // only finds targets among the row wrappers, so focus anywhere else
          // dead-zones arrow-key nav. Prevent the native focus move (click
          // still fires) and land focus on the row instead. Skip genuinely
          // interactive children so we don't hijack their focus.
          const interactive = (e.target as HTMLElement).closest(
            'button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (interactive && interactive !== e.currentTarget) {
            return;
          }
          e.preventDefault();
          isPointerFocusRedirect = true;
          try {
            e.currentTarget.focus();
          } finally {
            isPointerFocusRedirect = false;
          }
        }}
        // The row is a div, so it handles Space and Enter itself;
        // preventDefault keeps Space from scrolling the page.
        onKeyDown={(e) => {
          if (!(e.key === " " || e.key === "Enter")) {
            return;
          }

          e.preventDefault();
          handleSelect();
        }}
        className={cn(
          // Fixed height (was py-1.5 around a 19.5px line box ≈ 31.5px) so the
          // text-box trim on the label doesn't shrink the row.
          `relative z-10 flex ${sizeClasses.control} items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} cursor-pointer outline-none`,
          className
        )}
        {...properties}
      >
        {/* Radio circle */}
        <div
          className={cn(
            "relative shrink-0",
            isCompact ? "h-[14px] w-[14px]" : "h-[16px] w-[16px]"
          )}
        >
          {/* Border */}
          {/* Selected: the border turns transparent and the dot alone marks
              the state. Unselected: hover or focus darkens it from border to
              neutral-400 (neutral-500 dark) over 80ms. */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border-solid transition-all duration-80",
              isSelected
                ? "border-[1.5px] border-transparent"
                : isActive
                  ? "border-[1.5px] border-neutral-400 dark:border-neutral-500"
                  : "border-border border-[1.5px]"
            )}
          />
          {/* Dot */}
          {/* Pops in on spring.fast from scale 0.3 and opacity 0, and shrinks
              back out over 0.04s. */}
          {/* initial={false}: a row selected at mount shows the dot at
              full size instead of popping it in, so default selections
              don't animate on page load. */}
          <AnimatePresence initial={false}>
            {isSelected ? (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{
                  opacity: 0,
                  scale: 0.3,
                }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.3,
                  transition: { duration: 0.04 },
                }}
                transition={spring.fast}
              >
                <div
                  className={cn(
                    "bg-foreground rounded-full",
                    isCompact ? "h-[7px] w-[7px]" : "h-[8px] w-[8px]"
                  )}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Label */}
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
        <span className={cn("inline-grid", sizeClasses.text)}>
          {/* Always semibold, so the grid cell is sized for the heaviest
              weight and the row never shifts when the label gains weight. */}
          <span
            className="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
            style={{ fontVariationSettings: fontWeights.semibold }}
            aria-hidden="true"
          >
            {label}
          </span>
          {/* Weight changes only when selected ('wght' 400 → 550), so weight
              marks state; color goes muted → foreground when selected, hovered
              or focused. Both transition over 80ms. */}
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]",
              isSelected || isActive
                ? "text-foreground"
                : "text-muted-foreground"
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

        {/* Hidden Base UI Radio input for accessibility */}
        {/* Value mode only. Out of the tab order and hidden from assistive
            tech: the row already is the radio, so exposing the primitive too
            would announce every option twice. */}
        {value !== undefined && (
          <RadioPrimitive.Root
            value={value}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        )}
      </div>
    );
  }
);

RadioItem.displayName = "RadioItem";

export { RadioGroup, RadioItem };
export default RadioGroup;

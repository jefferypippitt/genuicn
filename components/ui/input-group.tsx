"use client";

import {
  useRef,
  useState,
  useMemo,
  createContext,
  useContext,
  forwardRef,
} from "react";
import { Field } from "@base-ui/react/field";
import { cn } from "@/lib/utils";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { SizeProvider, useSize } from "@/lib/size-context";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import type { SizeVariant } from "@/lib/size-context";
import type { ReactNode, HTMLAttributes, InputHTMLAttributes } from "react";
import type { IconComponent } from "@/lib/icon-context";

// ---------------------------------------------------------------------------
// InputGroup stacks labelled text fields that share one fluid hover scope.
// At rest a field has no fill and no visible ring. The field nearest the pointer shows a faint fill and its ring; the focused field lifts to the card surface. There is no separate highlight element: each field draws its own state.
// ---------------------------------------------------------------------------

interface InputGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null);

function useInputGroup() {
  const context = useContext(InputGroupContext);
  if (!context) {
    throw new Error("useInputGroup must be used within an InputGroup");
  }
  return context;
}

interface InputGroupProperties extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  /** Pins the group's fields to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, they follow the surrounding SizeProvider. */
  readonly size?: SizeVariant;
}

const InputGroup = forwardRef<HTMLDivElement, InputGroupProperties>(
  ({ children, size, className, ...properties }, reference) => {
    const containerReference = useRef<HTMLDivElement>(null);

    const { activeIndex, handlers, registerItem } =
      useFluidHover(containerReference);

    const contextValue = useMemo(
      () => ({ registerItem, activeIndex }),
      [registerItem, activeIndex]
    );

    const group = (
      <InputGroupContext.Provider value={contextValue}>
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
          // `relative` makes this div the fields' offsetParent — the fluid hover
          // hook measures items via offsetTop and compares against
          // container-relative mouse coords, so the two coordinate spaces must
          // share this origin (same as every other fluid hover consumer).
          className={cn(
            "relative flex w-72 max-w-full flex-col gap-3",
            className
          )}
          {...properties}
        >
          {children}
        </div>
      </InputGroupContext.Provider>
    );

    // A size prop pins every field in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group;
  }
);

InputGroup.displayName = "InputGroup";

interface InputFieldProperties extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "index"
> {
  readonly label: string;
  /** Keep the label for assistive tech but don't render it — for inline
   *  fields (a toolbar search) where the placeholder carries the meaning. */
  readonly labelHidden?: boolean;
  readonly placeholder?: string;
  readonly icon?: IconComponent;
  readonly index: number;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

const InputField = forwardRef<HTMLDivElement, InputFieldProperties>(
  (
    {
      label,
      labelHidden,
      placeholder,
      icon: Icon,
      index,
      value,
      onChange,
      error,
      disabled,
      className,
      ...properties
    },
    reference
  ) => {
    const internalReference = useRef<HTMLDivElement>(null);
    const inputReference = useRef<HTMLElement | null>(null);
    const { registerItem, activeIndex } = useInputGroup();
    const [isFocused, setIsFocused] = useState(false);
    const shape = useShape();
    const sizeClasses = useSize();
    const isCompact = sizeClasses.variant === "compact";

    useRegisterFluidHoverItem(registerItem, index, internalReference);

    // Lit when nearest the pointer OR focused, so tabbing through the form
    // shows the same cue as hovering it.
    const isActive = activeIndex === index;
    const labelActive = isActive || isFocused;

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    // Input container classes. The first match wins: disabled, error,
    // focused, hovered, rest. An error stays frameless at rest (the red label
    // and message already carry it) and shows its red ring on hover or focus.
    // Focus lifts the field to the card surface; hover only tints it.
    let bgClass: string;
    let ringClass: string;

    if (disabled) {
      bgClass = "bg-transparent";
      ringClass = "ring-border";
    } else if (error) {
      bgClass = isFocused
        ? "bg-card"
        : isActive
          ? "bg-destructive-light/60"
          : "bg-transparent";
      ringClass =
        isFocused || isActive ? "ring-destructive/50" : "ring-transparent";
    } else if (isFocused) {
      bgClass = "bg-card";
      ringClass = "ring-border";
    } else if (isActive) {
      bgClass = "bg-muted/50";
      ringClass = "ring-border";
    } else {
      bgClass = "bg-transparent";
      ringClass = "ring-transparent";
    }

    return (
      // Base UI Field wires the accessibility plumbing: Field.Label's htmlFor
      // targets the control, Field.Error's generated id lands in the control's
      // aria-describedby, and `invalid` drives aria-invalid / data-invalid.
      <Field.Root
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
        invalid={!!error}
        disabled={disabled}
        className={cn(
          "flex cursor-text flex-col gap-1",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {/* Label — sr-only when hidden so the field keeps its accessible
            name and the htmlFor wiring. */}
        <Field.Label
          className={cn(
            labelHidden ? "sr-only" : "inline-grid",
            sizeClasses.text,
            // One notch tighter than the ladder's control padding — the field
            // ring is invisible at rest, so the roomier inset reads as a gap.
            !labelHidden && (isCompact ? "pl-2" : "pl-2.5")
          )}
        >
          {/* An invisible semibold copy shares the grid cell and reserves the
              bold width, so a heavier label never shifts the layout. */}
          <span
            className="invisible col-start-1 row-start-1"
            style={{ fontVariationSettings: fontWeights.semibold }}
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1",
              error ? "text-destructive" : "text-muted-foreground"
            )}
            style={{
              fontVariationSettings: fontWeights.normal,
            }}
          >
            {label}
          </span>
        </Field.Label>

        {/* Input container */}
        <div
          onMouseDown={(e) => {
            // The old wrapper was one big <label>, so a click anywhere (icon,
            // padding) focused the input. Keep that, without disturbing the
            // input's own caret placement.
            if (e.target === inputReference.current) {
              return;
            }
            e.preventDefault();
            inputReference.current?.focus();
          }}
          className={cn(
            // Fixed height (was py-2 around the line box) so the field sits
            // exactly on the ladder's control height.
            `flex items-center ${sizeClasses.gap} ${shape.input} ${
              isCompact ? "px-2" : "px-2.5"
            } ${sizeClasses.control} ring-1 transition-all duration-80`,
            bgClass,
            ringClass
          )}
        >
          {/* The icon wakes with the field: muted → foreground and stroke
              1.5 → 2 over 80ms. */}
          {Icon ? (
            <Icon
              size={sizeClasses.icon}
              strokeWidth={labelActive ? 2 : 1.5}
              className={cn(
                "shrink-0 transition-[color,stroke-width] duration-80",
                labelActive ? "text-foreground" : "text-muted-foreground"
              )}
            />
          ) : null}
          <Field.Control
            ref={inputReference}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "text-foreground placeholder:text-muted-foreground w-full rounded-none bg-transparent font-[inherit] outline-none",
              sizeClasses.field
            )}
            style={{ fontVariationSettings: fontWeights.normal }}
            {...properties}
          />
        </div>

        {/* Error message: `match` pins it visible while the controlled
            `error` prop stands. Same inset as the label above. */}
        {error ? (
          <Field.Error
            match
            className={cn(
              "text-destructive",
              isCompact
                ? "pl-2 text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)]"
                : "pl-2.5 text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]"
            )}
            style={{ fontVariationSettings: fontWeights.normal }}
          >
            {error}
          </Field.Error>
        ) : null}
      </Field.Root>
    );
  }
);

InputField.displayName = "InputField";

export { InputGroup, InputField };
export default InputGroup;

"use client";

import {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  useId,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useIcons } from "@/lib/icon-context";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { Tooltip } from "@/components/ui/tooltip";
import type { SizeVariant } from "@/lib/size-context";
import type { HTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// InputCopy shows a value and copies it on click. The whole row is one
// <button>: hovering it tints the value and thickens the icon, so the full
// value reads as the click target, not just the icon. 2 variants: "icon"
// (copy icon with a tooltip) and "button" (icon plus a Copy label). Either
// way the result shows in place for 2000ms: a check that draws itself, or a
// red × when the copy fails.
// ---------------------------------------------------------------------------

type InputCopyVariant = "icon" | "button";
type InputCopyAlign = "right" | "left";

interface InputCopyProperties extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /**
  The value to display and copy to clipboard.
  */
  readonly value: string;
  /**
  Optional label displayed above the input.
  */
  readonly label?: string;
  /**
  Callback fired after the value is copied.
  */
  readonly onCopy?: () => void;
  /**
  Whether the component is disabled.
  */
  readonly disabled?: boolean;
  /**
  Display variant: icon-only with tooltip, or button with label.
  */
  readonly variant?: InputCopyVariant;
  /**
  Position of the copy action relative to the value.
  */
  readonly align?: InputCopyAlign;
  /** Pins the field to one step of the size ladder (default 36px, compact
   *  28px). Omitted, it follows the surrounding SizeProvider. */
  readonly size?: SizeVariant;
}

const InputCopy = forwardRef<HTMLDivElement, InputCopyProperties>(
  (
    {
      value,
      label,
      onCopy,
      disabled,
      variant = "icon",
      align = "right",
      size,
      className,
      ...properties
    },
    reference
  ) => {
    const icons = useIcons();
    const CopyIcon = icons.copy;
    // "copied" and "error" both occupy the same animation slot on the button
    const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
    // Keys the check and × glyphs. Copying again while "Copied" still shows
    // mounts a fresh glyph, so the draw replays instead of nothing happening.
    const [copyCount, setCopyCount] = useState(0);
    // "idle" = normal tooltip behavior, "copied" = force open, "suppressed" = force closed
    const [tooltipState, setTooltipState] = useState<
      "idle" | "copied" | "suppressed"
    >("idle");
    const timeoutReference = useRef<ReturnType<typeof setTimeout>>(null);
    const tooltipVisibleReference = useRef(false);
    const tooltipWasVisibleReference = useRef(false);
    const shape = useShape();
    const sizeClasses = useSize(size);
    // The row's height comes from the padded children, so the paddings step
    // down with the ladder (py-2 → 36px total, py-1 → 28px).
    const rowPy = sizeClasses.variant === "compact" ? "py-1" : "py-2";

    // Associate the visible label with the button: the button's accessible
    // name reads "Copy <label>" (its own state label + the field label).
    const generatedId = useId();
    const labelId = label ? `${generatedId}-label` : undefined;
    const buttonId = `${generatedId}-button`;

    const handlePointerDown = useCallback(() => {
      // Capture tooltip visibility before Radix closes it on pointer down
      tooltipWasVisibleReference.current = tooltipVisibleReference.current;
    }, []);

    // execCommand fallback for when the async Clipboard API is unavailable or
    // denied (insecure context, permissions policy) — copies via a temporary
    // off-screen textarea.
    const copyViaExecCommand = useCallback(() => {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      // 16px: iOS Safari zooms the page into a focused field set smaller,
      // and select() can focus this one.
      textarea.style.fontSize = "16px";
      document.body.append(textarea);
      textarea.select();
      // iOS Safari's select() only moves the caret to the end; the explicit
      // range is what selects the text there, so the copy isn't empty.
      textarea.setSelectionRange(0, textarea.value.length);
      let isOk = false;
      try {
        isOk = document.execCommand("copy");
      } catch {
        isOk = false;
      }
      textarea.remove();
      return isOk;
    }, [value]);

    const handleCopy = useCallback(async () => {
      if (disabled) {
        return;
      }
      let isOk = true;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        isOk = copyViaExecCommand();
      }
      setStatus(isOk ? "copied" : "error");
      setCopyCount((c) => c + 1);
      // The tooltip says "Copied" only if it was already showing when the
      // press began. Otherwise it stays shut: a click never summons a tooltip
      // the user wasn't reading.
      setTooltipState(
        tooltipWasVisibleReference.current ? "copied" : "suppressed"
      );
      if (isOk) {
        onCopy?.();
      }
      // A new copy restarts the 2000ms window. When it ends, the tooltip
      // stays suppressed until the pointer leaves and comes back, so it
      // doesn't reopen as "Copy to clipboard" right under a resting cursor.
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
      timeoutReference.current = setTimeout(() => {
        setStatus("idle");
        setTooltipState("suppressed");
      }, 2000);
    }, [value, disabled, onCopy, copyViaExecCommand]);

    const handleTooltipOpenChange = useCallback((open: boolean) => {
      tooltipVisibleReference.current = open;
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutReference.current) clearTimeout(timeoutReference.current);
      };
    }, []);

    // Re-entering the row re-arms the normal 500ms hover tooltip; leaving it
    // closes a "Copied" tooltip with the pointer.
    const handleMouseEnter = useCallback(() => {
      setTooltipState((previous) =>
        previous === "suppressed" ? "idle" : previous
      );
    }, []);

    const handleMouseLeave = useCallback(() => {
      setTooltipState((previous) =>
        previous === "copied" ? "suppressed" : previous
      );
    }, []);

    // A wait-mode swap on spring.fast: the copy icon shrinks out to 0.8
    // before the result grows in from 0.6, then the check or × strokes draw
    // themselves (pathLength 0 → 1 in 0.08s). Strokes go 1.5 → 2 on hover
    // over 80ms, with the rest of the row.
    const iconSwitch = (
      <AnimatePresence mode="wait" initial={false}>
        {status === "error" ? (
          <motion.span
            key={`error-${copyCount}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="text-destructive flex items-center justify-center [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]"
          >
            <svg
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M9 9L15 15M15 9L9 15"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.08, ease: "easeOut" },
                }}
              />
            </svg>
          </motion.span>
        ) : status === "copied" ? (
          <motion.span
            key={`check-${copyCount}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="flex items-center justify-center [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]"
          >
            <svg
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M6 12L10 16L18 8"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.08, ease: "easeOut" },
                }}
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="flex items-center justify-center"
          >
            <CopyIcon
              size={14}
              strokeWidth={1.5}
              className="transition-[stroke-width] duration-80 group-hover:stroke-[2]"
            />
          </motion.span>
        )}
      </AnimatePresence>
    );

    const actionElement =
      variant === "button" ? (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-1.5 transition-colors duration-80",
            rowPy,
            sizeClasses.text,
            "text-muted-foreground group-hover:text-foreground"
          )}
          style={{ fontVariationSettings: fontWeights.normal }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === "error" ? (
              <motion.span
                key={`error-label-${copyCount}`}
                className="text-destructive flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring.fast}
              >
                <span className="flex items-center justify-center">
                  <svg
                    width={14}
                    height={14}
                    viewBox="2 4 20 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M9 9L15 15M15 9L9 15"
                      initial={{ pathLength: 0 }}
                      animate={{
                        pathLength: 1,
                        transition: { duration: 0.08, ease: "easeOut" },
                      }}
                    />
                  </svg>
                </span>
                {/* The invisible "Copied" shares the grid cell with every label
                  (Copy, Copied, Failed), so the swap never changes the row's
                  width. */}
                <span className="inline-grid text-left select-none">
                  <span
                    className="invisible col-start-1 row-start-1"
                    aria-hidden="true"
                  >
                    Copied
                  </span>
                  <span className="col-start-1 row-start-1">Failed</span>
                </span>
              </motion.span>
            ) : status === "copied" ? (
              <motion.span
                key={`check-label-${copyCount}`}
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring.fast}
              >
                <span className="flex items-center justify-center">
                  <svg
                    width={14}
                    height={14}
                    viewBox="2 4 20 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M6 12L10 16L18 8"
                      initial={{ pathLength: 0 }}
                      animate={{
                        pathLength: 1,
                        transition: { duration: 0.08, ease: "easeOut" },
                      }}
                    />
                  </svg>
                </span>
                <span className="inline-grid text-left select-none">
                  <span
                    className="invisible col-start-1 row-start-1"
                    aria-hidden="true"
                  >
                    Copied
                  </span>
                  <span className="col-start-1 row-start-1">Copied</span>
                </span>
              </motion.span>
            ) : (
              <motion.span
                key="copy-label"
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring.fast}
              >
                <span className="flex items-center justify-center">
                  <CopyIcon
                    size={14}
                    strokeWidth={1.5}
                    className="transition-[stroke-width] duration-80 group-hover:stroke-[2]"
                  />
                </span>
                <span className="inline-grid text-left select-none">
                  <span
                    className="invisible col-start-1 row-start-1"
                    aria-hidden="true"
                  >
                    Copied
                  </span>
                  <span className="col-start-1 row-start-1">Copy</span>
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      ) : (
        <span
          className={cn(
            "shrink-0 px-1.5 transition-colors duration-80",
            rowPy,
            "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {iconSwitch}
        </span>
      );

    // select-none: a press copies instead of starting a text selection. On
    // hover a <mark> tints the whole value, so it reads as what gets copied.
    const valueElement = (
      <span
        className={cn(
          "text-foreground min-w-0 flex-1 truncate text-left font-mono select-none",
          sizeClasses.text,
          rowPy,
          align === "left" ? "pl-1" : "pl-0"
        )}
        style={{ fontVariationSettings: fontWeights.normal }}
      >
        <mark className="text-foreground group-hover:text-foreground bg-transparent transition-colors duration-80 group-hover:bg-[#6B97FF]/20">
          {value}
        </mark>
      </span>
    );

    const buttonContent =
      align === "left" ? (
        <>
          {actionElement}
          {valueElement}
        </>
      ) : (
        <>
          {valueElement}
          {actionElement}
        </>
      );

    const button = (
      <button
        id={buttonId}
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleCopy}
        disabled={disabled}
        // The name follows the state, so a screen reader hears the result.
        aria-label={
          status === "copied"
            ? "Copied"
            : status === "error"
              ? "Copy failed"
              : label
                ? "Copy"
                : "Copy to clipboard"
        }
        aria-labelledby={label ? `${buttonId} ${labelId}` : undefined}
        className={cn(
          "group flex w-full cursor-pointer items-center transition-all duration-80 outline-none",
          "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]",
          shape.input
        )}
      >
        {buttonContent}
      </button>
    );

    return (
      <div
        ref={reference}
        className={cn(
          "flex flex-col gap-0.5",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...properties}
      >
        {label ? (
          <span
            id={labelId}
            className={cn(
              "text-muted-foreground",
              sizeClasses.text,
              align === "left" ? "pl-1" : "pl-0"
            )}
            style={{ fontVariationSettings: fontWeights.normal }}
          >
            {label}
          </span>
        ) : null}
        {variant === "icon" ? (
          <Tooltip
            content={
              tooltipState === "idle"
                ? "Copy to clipboard"
                : status === "error"
                  ? "Copy failed"
                  : "Copied"
            }
            delayDuration={500}
            sideOffset={2}
            forceOpen={
              tooltipState === "copied"
                ? true
                : tooltipState === "suppressed"
                  ? false
                  : undefined
            }
            onOpenChange={handleTooltipOpenChange}
          >
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </div>
    );
  }
);

InputCopy.displayName = "InputCopy";

export { InputCopy };
export type { InputCopyProperties as InputCopyProps };
export default InputCopy;

"use client";

// Scroll area built on Base UI — shape-system scrollbar, native overflow
// fallback on touch-primary devices. Scrollbar
// machinery adapted from Lina by SameerJS6 (https://lina.sameer.sh); built on
// @base-ui/react/scroll-area, whose scrollbars stay mounted while scrollable
// and expose hover/scroll state as data attributes instead of Radix's
// show/hide presence animation.

import { createContext, forwardRef, useContext } from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";
import { useShape } from "@/lib/shape-context";
import { useTouchPrimary } from "@/hooks/use-touch-primary";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";

// On touch-primary devices the Base UI machinery is skipped entirely in
// favour of native overflow scrolling (better physics, momentum,
// rubber-banding); the context lets the exported ScrollBar no-op there.
const ScrollAreaContext = createContext<boolean>(false);

type Orientation = "vertical" | "horizontal" | "both";

interface ScrollAreaProperties extends ComponentPropsWithoutRef<"div"> {
  readonly viewportClassName?: string;
  /**
  Which axes get scrollbars. Defaults to `"vertical"`.
  */
  readonly orientation?: Orientation;
}

const ScrollArea = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProperties
>(
  (
    {
      className,
      children,
      viewportClassName,
      orientation = "vertical",
      ...properties
    },
    reference
  ) => {
    const isTouch = useTouchPrimary();

    return (
      <ScrollAreaContext.Provider value={isTouch}>
        {isTouch ? (
          <div
            ref={reference}
            role="group"
            data-slot="scroll-area"
            aria-roledescription="scroll area"
            className={cn("relative overflow-hidden", className)}
            {...properties}
          >
            <div
              data-slot="scroll-area-viewport"
              className={cn(
                "size-full rounded-[inherit]",
                orientation === "vertical" && "overflow-y-auto",
                orientation === "horizontal" && "overflow-x-auto",
                orientation === "both" && "overflow-auto",
                viewportClassName
              )}
              tabIndex={0}
            >
              {children}
            </div>
          </div>
        ) : (
          <ScrollAreaPrimitive.Root
            ref={reference}
            data-slot="scroll-area"
            className={cn("relative overflow-hidden", className)}
            {...properties}
          >
            <ScrollAreaPrimitive.Viewport
              data-slot="scroll-area-viewport"
              className={cn("size-full rounded-[inherit]", viewportClassName)}
            >
              {/* Content gives Base UI an intrinsic size to measure
                  horizontal overflow against. */}
              <ScrollAreaPrimitive.Content>
                {children}
              </ScrollAreaPrimitive.Content>
            </ScrollAreaPrimitive.Viewport>
            {orientation !== "horizontal" && (
              <ScrollBar orientation="vertical" />
            )}
            {orientation !== "vertical" && (
              <ScrollBar orientation="horizontal" />
            )}
            {orientation === "both" && <ScrollAreaPrimitive.Corner />}
          </ScrollAreaPrimitive.Root>
        )}
      </ScrollAreaContext.Provider>
    );
  }
);

ScrollArea.displayName = "ScrollArea";

const ScrollBar = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = "vertical", ...properties }, reference) => {
  const isTouch = useContext(ScrollAreaContext);
  const shape = useShape();

  if (isTouch) {
    return null;
  }

  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={reference}
      orientation={orientation}
      data-slot="scroll-area-scrollbar"
      // Base UI keeps the scrollbar mounted while scrollable; visibility is
      // a plain opacity transition off its hover/scroll state attributes,
      // matching the cue fade — 160ms in, 120ms out (exits faster, per the
      // animation guidelines); spring tokens are Motion configs and
      // don't apply here.
      className={cn(
        // The 10px track stays as a comfortable hit target; the thumb inside
        // it rests narrow and low-contrast, then widens + darkens on hover so
        // it gets out of the way until you reach for it.
        "group/scrollbar absolute z-20 flex touch-none select-none",
        // Show immediately; on hide, wait out the 160ms thumb shrink before
        // fading so the thumb visibly narrows back first instead of the fade
        // masking it.
        "opacity-0 transition-opacity delay-160 duration-120 ease-out",
        "data-[hovering]:duration-160 data-[scrolling]:duration-160",
        "data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
        "data-[hovering]:delay-0 data-[scrolling]:delay-0",
        orientation === "vertical" && "top-0 right-0 h-full w-2.5",
        orientation === "horizontal" && "bottom-0 left-0 h-2.5 w-full flex-col",
        className
      )}
      {...properties}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          // Fixed surface-relative overlay ramp (8 → 12 → 16%) — same tint
          // direction as the menu hover/active tokens, one notch stronger.
          "relative bg-[rgb(var(--overlay)/0.08)] transition-[background-color,width,height] duration-160 ease-in-out",
          "group-hover/scrollbar:bg-[rgb(var(--overlay)/0.12)] active:!bg-[rgb(var(--overlay)/0.16)]",
          shape.bg,
          // -translate nudges the thumb 2px off the container edge; the track
          // (and its 10px hit target) stays flush so edge-throws still land.
          orientation === "vertical" &&
            "mx-auto my-1 h-[var(--scroll-area-thumb-height)] w-1 -translate-x-0.5 group-hover/scrollbar:w-1.5",
          orientation === "horizontal" &&
            "mx-1 my-auto h-1 w-[var(--scroll-area-thumb-width)] -translate-y-0.5 group-hover/scrollbar:h-1.5"
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
});

ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
export type { ScrollAreaProperties as ScrollAreaProps };

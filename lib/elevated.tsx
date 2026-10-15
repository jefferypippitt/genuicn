"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useSurface, SurfaceProvider } from "@/lib/surface-context";
import { surfaceClasses } from "@/lib/surface-classes";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface ElevatedProperties extends ComponentPropsWithoutRef<"div"> {
  /**
   * Steps above the current substrate.
   *
   * The component's own surface level becomes `min(substrate + offset, 8)`
   * and is re-provided to descendants via SurfaceProvider, so further
   * nesting walks up the ladder automatically.
   *
   * Conventional offsets:
   *   2 — dropdown / popover / select menu 4 — dialog / modal
   */
  readonly offset: number;
  /**
   * Override for the shadow level. Defaults to the computed surface level.
   *
   * Pass a fixed value when the component should keep a constant shadow
   * weight regardless of how deeply it's nested — e.g. a dropdown always
   * reads `shadow-surface-3` whether it opens on the page or inside a
   * dialog, even though its background tracks the substrate.
   */
  readonly shadowLevel?: number;
  readonly children?: ReactNode;
}

const Elevated = forwardRef<HTMLDivElement, ElevatedProperties>(
  ({ offset, shadowLevel, className, children, ...properties }, reference) => {
    const substrate = useSurface();
    const level = Math.min(substrate + offset, 8);
    return (
      <SurfaceProvider value={level}>
        <div
          ref={reference}
          className={cn(surfaceClasses(level, shadowLevel ?? level), className)}
          {...properties}
        >
          {children}
        </div>
      </SurfaceProvider>
    );
  }
);
Elevated.displayName = "Elevated";

export { Elevated };

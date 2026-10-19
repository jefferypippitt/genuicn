"use client";

import { useId, useRef, useState } from "react";
// eslint-disable-next-line react-doctor/use-lazy-motion -- the app imports motion directly everywhere, so LazyMotion here would save nothing
import { motion } from "motion/react";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import { FAKE_PASSES } from "@/features/flights/flight-fake";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { BoardingPassVariant } from "@/features/flights/components/boarding-pass-card";

const VARIANTS = [
  { label: "World map", variant: "map" },
  { label: "Airline color", variant: "brand" },
] as const satisfies readonly {
  label: string;
  variant: BoardingPassVariant;
}[];

/**
The selection pill's fade, the same 80ms the library's highlights use.
*/
const FADE = { duration: 0.08 } as const;

/**
One airline: a radio under a cell the height of a tab. The cell has no hover or fill of its own; the grid's fluid hover highlight and the selection pill sit under it. The name turns semibold over a ghost copy that already reserves the semibold width, so nothing reflows.
*/
function Airline({
  name,
  label,
  index,
  isPicked,
  isActive,
  registerItem,
  onPick,
}: {
  readonly name: string;
  readonly label: string;
  readonly index: number;
  readonly isPicked: boolean;
  readonly isActive: boolean;
  readonly registerItem: (index: number, element: HTMLElement | null) => void;
  readonly onPick: (index: number) => void;
}) {
  const reference = useRef<HTMLLabelElement>(null);
  const sizes = useSize();
  const shape = useShape();
  useRegisterFluidHoverItem(registerItem, index, reference);
  return (
    // The radio carries the name through aria-label; the visible text is a
    // decorative copy with its ghost sizer.

    <label ref={reference} className="relative z-10 block cursor-pointer">
      <input
        type="radio"
        name={name}
        aria-label={label}
        value={label}
        checked={isPicked}
        onChange={() => onPick(index)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex items-center",
          "peer-focus-visible:ring-ring peer-focus-visible:ring-2",
          sizes.control,
          sizes.px,
          shape.bg
        )}
      >
        <span className={cn("inline-grid whitespace-nowrap", sizes.text)}>
          <span
            className="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
            style={{ fontVariationSettings: fontWeights.semibold }}
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]",
              isActive || isPicked ? "text-foreground" : "text-muted-foreground"
            )}
            style={{
              fontVariationSettings: isPicked
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {label}
          </span>
        </span>
      </span>
    </label>
  );
}

/**
Every demo airline in a grid (2, 3, then 5 columns), with one fluid hover highlight that finds the nearest airline across rows and columns, and the pick on a bg-active pill that springs from airline to airline.
*/
function AirlinePicker({
  selected,
  onSelect,
}: {
  readonly selected: number;
  readonly onSelect: (index: number) => void;
}) {
  const name = useId();
  const shape = useShape();
  const gridReference = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(gridReference, { axis: "xy" });
  const pickedRect = hover.isMeasured ? hover.itemRects[selected] : undefined;
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Airline</legend>
      <div
        ref={gridReference}
        {...hover.handlers}
        className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
      >
        {pickedRect ? (
          <motion.div
            aria-hidden
            className={cn(
              "bg-active pointer-events-none absolute top-0 left-0",
              shape.bg
            )}
            // Cells in a column share a width, so the pill mostly travels;
            // its size snaps to the picked cell instead of animating layout.
            style={{ height: pickedRect.height, width: pickedRect.width }}
            initial={false}
            animate={{ opacity: 1, x: pickedRect.left, y: pickedRect.top }}
            transition={{ ...spring.moderate, opacity: FADE }}
          />
        ) : null}
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {FAKE_PASSES.map((pass, index) => (
          <Airline
            key={pass.airlineCode}
            name={name}
            label={pass.airline}
            index={index}
            isPicked={index === selected}
            isActive={index === hover.activeIndex}
            registerItem={hover.registerItem}
            onPick={onSelect}
          />
        ))}
      </div>
    </fieldset>
  );
}

export default function TicketGallery() {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedAirline, setSelectedAirline] = useState(0);
  const { variant } = VARIANTS[selectedVariant];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <TabsSubtle
          selectedIndex={selectedVariant}
          onSelect={setSelectedVariant}
        >
          {VARIANTS.map((option, index) => (
            <TabsSubtleItem
              key={option.variant}
              index={index}
              label={option.label}
            />
          ))}
        </TabsSubtle>
        <AirlinePicker
          selected={selectedAirline}
          onSelect={setSelectedAirline}
        />
      </div>
      <BoardingPassCard
        state="ready"
        data={FAKE_PASSES[selectedAirline]}
        variant={variant}
      />
    </div>
  );
}

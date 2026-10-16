"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import { FAKE_PASSES } from "@/features/flights/flight-fake";
import type { BoardingPassVariant } from "@/features/flights/components/boarding-pass-card";

const VARIANTS = [
  { label: "World map", variant: "map" },
  { label: "Airline color", variant: "brand" },
] as const satisfies readonly {
  label: string;
  variant: BoardingPassVariant;
}[];

export default function TicketGallery() {
  const [selected, setSelected] = useState(0);
  const { variant } = VARIANTS[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {VARIANTS.map((option, index) => (
          <TabsSubtleItem
            key={option.variant}
            index={index}
            label={option.label}
          />
        ))}
      </TabsSubtle>
      <div className="flex flex-col gap-4">
        {FAKE_PASSES.map((pass) => (
          <figure key={pass.airlineCode} className="flex flex-col gap-2">
            <BoardingPassCard state="ready" data={pass} variant={variant} />
            <figcaption className="text-muted-foreground">
              {pass.airline}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

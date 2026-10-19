"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import WinProbabilityCard from "@/features/win-probability/components/win-probability-card";
import final from "./snapshot/final.json";
import live from "./snapshot/live.json";
import pre from "./snapshot/pre.json";
import type { WinProbabilityData } from "@/features/win-probability/win-probability-schema";

const STATES = [
  { data: pre, label: "Before tip-off" },
  { data: live, label: "Live" },
  { data: final, label: "Final" },
] as const;

export default function GameGallery() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {STATES.map((state, index) => (
          <TabsSubtleItem key={state.label} index={index} label={state.label} />
        ))}
      </TabsSubtle>
      <WinProbabilityCard
        state="ready"
        data={STATES[selected].data as WinProbabilityData}
      />
    </div>
  );
}

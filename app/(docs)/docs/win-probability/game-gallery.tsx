"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import WinProbabilityCard from "@/features/win-probability/components/win-probability-card";
import final from "./snapshot/final.json";
import live from "./snapshot/live.json";
import pre from "./snapshot/pre.json";
import type { WinProbabilityData } from "@/features/win-probability/win-probability-schema";

/**
Real ESPN chances, saved on October 17, 2026. Before tip-off: ESPN's prediction for the 76ers at the Knicks on opening night. Live: ESPN's chance halfway through the 2026 Finals Game 5, the Knicks at the Spurs, shown as the game was on. Final: how that game ended.
*/
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

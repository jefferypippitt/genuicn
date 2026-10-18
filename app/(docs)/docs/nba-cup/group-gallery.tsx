"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import NbaCupCard from "@/features/nba-cup/components/nba-cup-card";
import eastA from "./snapshot/east-a.json";
import eastB from "./snapshot/east-b.json";
import eastC from "./snapshot/east-c.json";
import westA from "./snapshot/west-a.json";
import westB from "./snapshot/west-b.json";
import westC from "./snapshot/west-c.json";
import type { CupGroupData } from "@/features/nba-cup/nba-cup-schema";

/**
One tab per group, each as /api/nba-cup answered it on October 17, 2026, before the 2026-27 group stage.
*/
const GROUPS = [
  { data: eastA, label: "East A" },
  { data: eastB, label: "East B" },
  { data: eastC, label: "East C" },
  { data: westA, label: "West A" },
  { data: westB, label: "West B" },
  { data: westC, label: "West C" },
] as const;

export default function GroupGallery() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {GROUPS.map((group, index) => (
          <TabsSubtleItem key={group.label} index={index} label={group.label} />
        ))}
      </TabsSubtle>
      <NbaCupCard state="ready" data={GROUPS[selected].data as CupGroupData} />
    </div>
  );
}

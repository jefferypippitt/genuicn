"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import PlayerCard from "@/features/player/components/player-card";
import lebron from "./snapshot/lebron.json";
import rookie from "./snapshot/rookie.json";
import wembanyama from "./snapshot/wembanyama.json";
import type { PlayerData } from "@/features/player/player-schema";

const EXAMPLES = [
  { data: [lebron], label: "LeBron James" },
  { data: [lebron, wembanyama], label: "Compare two players" },
  { data: [rookie], label: "A rookie" },
] as const;

export default function PlayerGallery() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {EXAMPLES.map((example, index) => (
          <TabsSubtleItem
            key={example.label}
            index={index}
            label={example.label}
          />
        ))}
      </TabsSubtle>
      <PlayerCard
        state="ready"
        data={EXAMPLES[selected].data as readonly PlayerData[]}
      />
    </div>
  );
}

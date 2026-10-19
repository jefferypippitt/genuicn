"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import StandingsCard from "@/features/standings/components/standings-card";
import east from "./snapshot/east.json";
import west from "./snapshot/west.json";
import type { StandingsData } from "@/features/standings/standings-schema";

const CONFERENCES = [
  { data: east, label: "Eastern Conference" },
  { data: west, label: "Western Conference" },
] as const;

export default function ConferenceGallery() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {CONFERENCES.map((conference, index) => (
          <TabsSubtleItem
            key={conference.label}
            index={index}
            label={conference.label}
          />
        ))}
      </TabsSubtle>
      <StandingsCard
        state="ready"
        data={CONFERENCES[selected].data as StandingsData}
      />
    </div>
  );
}

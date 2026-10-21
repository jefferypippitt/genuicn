"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import austinRun from "@/content/recordings/forecast-austin.json";
import seattleRun from "@/content/recordings/forecast-seattle.json";
import { ForecastCard } from "@/features/forecast/components/forecast-card";
import {
  FORECAST_VIEW_LABEL,
  FORECAST_VIEWS,
} from "@/features/forecast/forecast-schema";
import type { ForecastData } from "@/features/forecast/forecast-schema";

/**
Two places as the playground's recordings saved them from Open-Meteo: real forecasts, the same ones the card draws live.
*/
const PLACES = [
  Object.values(austinRun.responsesByUrl)[0],
  Object.values(seattleRun.responsesByUrl)[0],
] as ForecastData[];

const DEFAULT_VIEW = FORECAST_VIEWS.indexOf("hourly");

export default function ViewGallery() {
  const [selected, setSelected] = useState(DEFAULT_VIEW);
  const view = FORECAST_VIEWS[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {FORECAST_VIEWS.map((option, index) => (
          <TabsSubtleItem
            key={option}
            index={index}
            label={FORECAST_VIEW_LABEL[option]}
          />
        ))}
      </TabsSubtle>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {PLACES.map((data) => (
          <figure key={data.location} className="flex flex-col gap-2">
            {/* Keyed on the view, so each tab opens the card on it. */}
            <ForecastCard key={view} state="ready" data={data} view={view} />
            <figcaption className="text-muted-foreground">
              {data.location}, {data.region}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { WeatherCard } from "@/features/weather/components/weather-card";
import { fakeWeather } from "@/features/weather/weather-fake";
import {
  SKY_PHASE_LABEL,
  SKY_PHASES,
  WEATHER_CONDITIONS,
} from "@/features/weather/weather-schema";
import type { WeatherCondition } from "@/features/weather/weather-schema";

const CONDITION_LABEL: Record<WeatherCondition, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  drizzle: "Drizzle",
  fog: "Fog",
  "partly-cloudy": "Partly cloudy",
  rain: "Rain",
  snow: "Snow",
  thunderstorm: "Thunderstorm",
};

const DAY_INDEX = SKY_PHASES.indexOf("day");

export default function SkyGallery() {
  const [selected, setSelected] = useState(DAY_INDEX);
  const phase = SKY_PHASES[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {SKY_PHASES.map((option, index) => (
          <TabsSubtleItem
            key={option}
            index={index}
            label={SKY_PHASE_LABEL[option]}
          />
        ))}
      </TabsSubtle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WEATHER_CONDITIONS.map((condition) => (
          <figure key={condition} className="flex flex-col gap-2">
            <WeatherCard
              state="ready"
              data={fakeWeather("Seattle", { condition, phase })}
            />
            <figcaption className="text-muted-foreground">
              {CONDITION_LABEL[condition]}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

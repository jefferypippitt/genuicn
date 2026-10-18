"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import ScoreboardCard from "@/features/scoreboard/components/scoreboard-card";
import finalsClincher from "./snapshot/finals-clincher.json";
import finals from "./snapshot/finals.json";
import firstRound from "./snapshot/first-round.json";
import nbaCup from "./snapshot/nba-cup.json";
import playInWest from "./snapshot/play-in-west.json";
import playIn from "./snapshot/play-in.json";
import preseasonChina from "./snapshot/preseason-china.json";
import preseason from "./snapshot/preseason.json";
import regular from "./snapshot/regular.json";
import upcomingOpener from "./snapshot/upcoming-opener.json";
import upcoming from "./snapshot/upcoming.json";
import westFinals from "./snapshot/west-finals.json";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";

/**
One tab per part of the season, each with two real games as /api/scoreboard answered them on October 17, 2026.
*/
const PHASES = [
  {
    games: [
      { caption: "Opening night, Celtics at Pistons", data: upcomingOpener },
      { caption: "Opening night, Thunder at Spurs", data: upcoming },
    ],
    label: "Before the game",
  },
  {
    games: [
      { caption: "Nuggets at Lakers", data: preseason },
      { caption: "A special game, in overtime", data: preseasonChina },
    ],
    label: "Preseason",
  },
  {
    games: [
      { caption: "An ordinary game has no line", data: regular },
      { caption: "A special game, the NBA Cup final", data: nbaCup },
    ],
    label: "Regular season",
  },
  {
    games: [
      { caption: "East, in overtime", data: playIn },
      { caption: "West", data: playInWest },
    ],
    label: "Play-In",
  },
  {
    games: [
      { caption: "First round, with the series score", data: firstRound },
      { caption: "West Finals, Game 7", data: westFinals },
    ],
    label: "Playoffs",
  },
  {
    games: [
      { caption: "Game 4", data: finals },
      { caption: "Game 5, the series won", data: finalsClincher },
    ],
    label: "NBA Finals",
  },
] as const;

export default function GameGallery() {
  const [selected, setSelected] = useState(0);
  const { games } = PHASES[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {PHASES.map((phase, index) => (
          <TabsSubtleItem key={phase.label} index={index} label={phase.label} />
        ))}
      </TabsSubtle>
      <div className="flex flex-col gap-4">
        {games.map(({ caption, data }) => (
          <figure key={caption} className="flex flex-col gap-2">
            <ScoreboardCard state="ready" data={data as ScoreboardData} />
            <figcaption className="text-muted-foreground">{caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

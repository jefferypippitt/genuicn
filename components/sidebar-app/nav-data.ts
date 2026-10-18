import type { IconName } from "@/lib/icon-context";

export interface NavItem {
  /**
  The item's name. In a group, the short one ("Scoreboard"): fullLabel adds the group where the page shows outside it.
  */
  label: string;
  icon?: IconName;
  href?: string;
  description?: string;
  /**
  A row in the sidebar that opens to show this item and the others with the same group, e.g. "NBA" under Sports.
  */
  group?: string;
}

export interface NavSection {
  label: string;
  kind: "docs" | "cards";
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Getting started",
    kind: "docs",
    items: [
      { label: "Gallery", icon: "square-library", href: "/" },
      { label: "Introduction", icon: "home", href: "/docs" },
      { label: "Installation", icon: "rocket", href: "/docs/installation" },
      { label: "Theming", icon: "palette" },
      { label: "Changelog", icon: "clock", href: "/changelog" },
      { label: "Roadmap", icon: "lightbulb", href: "/roadmap" },
    ],
  },
  {
    label: "Finance",
    kind: "cards",
    items: [
      {
        label: "Quote",
        href: "/docs/quote",
        description:
          "Price, change, a small trend line, and a day, week, month and year switch.",
      },
      {
        label: "Candlestick chart",
        description: "Candles with volume and timeframe controls.",
      },
      {
        label: "Compare",
        description: "Two to four tickers on one chart, plus key numbers.",
      },
      {
        label: "Earnings",
        description: "Expected against actual, history, and the next date.",
      },
      {
        label: "Portfolio",
        description: "Holdings, an allocation donut, and today's gain or loss.",
      },
      {
        label: "Market movers",
        description: "Top gainers and losers. Tap one for detail.",
      },
      {
        description:
          "Live price, 24-hour change, market cap, volume, and a 24-hour trend line.",
        href: "/docs/crypto",
        label: "Crypto",
      },
      {
        label: "Watchlist",
        description: "Add and remove tickers, synced back to the model.",
      },
      {
        label: "Price alert",
        description: "Set a target price, then confirm it.",
      },
    ],
  },
  {
    label: "Sports",
    kind: "cards",
    items: [
      {
        description:
          "One NBA game's live score, with both teams and the clock.",
        group: "NBA",
        href: "/docs/scoreboard",
        label: "Scoreboard",
      },
      {
        group: "NBA",
        label: "Box score",
        description: "Each player's stats for one game, with the team totals.",
      },
      {
        group: "NBA",
        label: "Play-by-play",
        description: "Each play of a live game as it happens, newest first.",
      },
      {
        description:
          "One conference's table, with each team's record, games behind, and recent form.",
        group: "NBA",
        href: "/docs/standings",
        label: "Standings",
      },
      {
        description:
          "One NBA Cup group's table, with each team's games, wins, losses, and points for and against.",
        group: "NBA",
        href: "/docs/nba-cup",
        label: "NBA Cup",
      },
      {
        description:
          "One player's number, height, age, experience, and per-game averages, with his team now.",
        group: "NBA",
        href: "/docs/player",
        label: "Player",
      },
      {
        group: "NBA",
        label: "Head-to-head",
        description:
          "Two teams or players side by side, with their record against each other.",
      },
      {
        group: "NBA",
        label: "Schedule",
        description: "Upcoming games, each with an add-to-calendar button.",
      },
      {
        group: "NBA",
        label: "Playoff bracket",
        description:
          "The bracket round by round, with winners moving on as series end.",
      },
      {
        description:
          "Each team's chance of winning one game, before tip-off and live, with what a win pays back.",
        group: "NBA",
        href: "/docs/win-probability",
        label: "Win probability",
      },
      {
        group: "NBA",
        label: "Start or sit",
        description: "Which player to start in this week's fantasy lineup.",
      },
    ],
  },
  {
    label: "Everyday & travel",
    kind: "cards",
    items: [
      {
        label: "Weather",
        href: "/docs/weather",
        description:
          "Current conditions and the next six hours, over a sky drawn for the sun and the weather there.",
      },
      {
        label: "Flights",
        href: "/docs/flights",
        description:
          "A boarding pass looked up from the flight number, and a check-in assistant that asks for your booking, seat, bags, and extras.",
      },
      {
        label: "Hotel",
        description: "A hotel's photos, nightly price, and rating.",
      },
      {
        label: "Itinerary",
        description: "A trip's flights, stays, and plans on one timeline.",
      },
      {
        label: "Converter",
        description:
          "Converts units, and currencies at the current exchange rate.",
      },
      {
        label: "Recipe",
        description:
          "Ingredients, a step-by-step cooking mode, and nutrition facts.",
      },
      {
        label: "News",
        description: "Headlines on a topic, each with its source and time.",
      },
      {
        label: "Movie & TV",
        description: "A title card with where to stream it.",
      },
      {
        label: "GitHub repo",
        description: "A repository's stars, open issues, and latest release.",
      },
      {
        label: "npm package",
        description:
          "A package's latest version, weekly downloads, and install size.",
      },
    ],
  },
  {
    label: "Charts",
    kind: "cards",
    items: [
      {
        label: "Smart chart",
        description:
          "The model sends data and a chart type, and the card draws a line, bar, area, pie or radar chart.",
      },
      {
        label: "Stat tiles",
        description: "A big number, its change, and a small trend line.",
      },
      {
        label: "Heatmap",
        description:
          "Values on a grid, shaded by size, like activity by day and hour.",
      },
      {
        label: "Live chart",
        description: "A chart that draws as the data streams in.",
      },
    ],
  },
];

/**
The page's name on its own, outside the sidebar: "NBA scoreboard" for Scoreboard in the NBA group. A label that already names its group ("NBA Cup") stays as it is.
*/
export function fullLabel(item: NavItem): string {
  return !item.group || item.label.startsWith(item.group)
    ? item.label
    : `${item.group} ${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`;
}

export const BUILT_SECTIONS: NavSection[] = NAV_SECTIONS.map((section) => ({
  ...section,
  items: section.items.filter((item) => item.href),
})).filter((section) => section.items.length > 0);

export const PAGE_ORDER = NAV_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) =>
    item.href ? [{ href: item.href, label: fullLabel(item) }] : []
  )
);

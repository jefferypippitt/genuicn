import type { IconName } from "@/lib/icon-context";

export interface NavItem {
  label: string;
  icon?: IconName;
  href?: string;
  description?: string;
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
        label: "Crypto",
        description: "Live price, 24-hour change, and market cap.",
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
        label: "Live scoreboard",
        description: "Live scores in each team's colors.",
      },
      {
        label: "Box score",
        description: "Each player's stats for one game, with the team totals.",
      },
      {
        label: "Play-by-play",
        description: "Each play of a live game as it happens, newest first.",
      },
      {
        label: "Standings",
        description: "A table with playoff lines and recent form.",
      },
      {
        label: "Player",
        description: "Season stats and a chart of recent games.",
      },
      {
        label: "Head-to-head",
        description:
          "Two teams or players side by side, with their record against each other.",
      },
      {
        label: "Schedule",
        description: "Upcoming games, each with an add-to-calendar button.",
      },
      {
        label: "Playoff bracket",
        description:
          "The bracket round by round, with winners moving on as series end.",
      },
      {
        label: "Win probability",
        description: "Each side's chance of winning, charted through the game.",
      },
      {
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
        description: "Flight results, live status, and a boarding pass.",
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

export const BUILT_SECTIONS: NavSection[] = NAV_SECTIONS.map((section) => ({
  ...section,
  items: section.items.filter((item) => item.href),
})).filter((section) => section.items.length > 0);

export const PAGE_ORDER = NAV_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) =>
    item.href ? [{ href: item.href, label: item.label }] : []
  )
);

import type { IconName } from "@/lib/icon-context";

export interface NavItem {
  label: string;
  icon?: IconName;
  href?: string;
  description?: string;
  group?: string;
}

export interface NavSection {
  label: string;
  kind: "docs" | "cards";
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/", icon: "square-library", label: "Gallery" },
      { href: "/docs", icon: "home", label: "Introduction" },
      { href: "/docs/installation", icon: "rocket", label: "Installation" },
      { icon: "palette", label: "Theming" },
      { href: "/changelog", icon: "clock", label: "Changelog" },
      { href: "/roadmap", icon: "lightbulb", label: "Roadmap" },
    ],
    kind: "docs",
    label: "Getting started",
  },
  {
    items: [
      {
        description:
          "Price, change, and a small trend line, with a 1D, 1W, 1M, and 1Y switch.",
        href: "/docs/quote",
        label: "Quote",
      },
      {
        description:
          "Open, high, low, and close for each period, with volume and a 1D, 1W, 1M, 6M, and 1Y switch.",
        href: "/docs/candlestick",
        label: "Candlestick",
      },
      {
        description: "Two to four tickers on one chart, plus key numbers.",
        label: "Compare",
      },
      {
        description: "Expected against actual, history, and the next date.",
        label: "Earnings",
      },
      {
        description: "Holdings, an allocation donut, and today's gain or loss.",
        label: "Portfolio",
      },
      {
        description: "Top gainers and losers. Tap one for detail.",
        label: "Market movers",
      },
      {
        description:
          "Live price, change, market cap, and volume, with a 24H, 1W, 1M, 1Y, and All switch.",
        href: "/docs/crypto",
        label: "Crypto",
      },
      {
        description: "Add and remove tickers, synced back to the model.",
        label: "Watchlist",
      },
      {
        description: "Set a target price, then confirm it.",
        label: "Price alert",
      },
    ],
    kind: "cards",
    label: "Finance",
  },
  {
    items: [
      {
        description:
          "One NBA game's live score, with both teams, their records, the clock, and each quarter.",
        group: "NBA",
        href: "/docs/scoreboard",
        label: "Scoreboard",
      },
      {
        description:
          "One conference's table, with record, games behind, home and away, last ten, and streak.",
        group: "NBA",
        href: "/docs/standings",
        label: "Standings",
      },
      {
        description:
          "One NBA Cup group's table, with games, wins, losses, points, and point difference.",
        group: "NBA",
        href: "/docs/nba-cup",
        label: "NBA Cup",
      },
      {
        description:
          "NBA players in one table, with photo, number, per-game averages, and current team.",
        group: "NBA",
        href: "/docs/player",
        label: "Player",
      },
      {
        description:
          "Each team's chance of winning one game, before tip-off, live, and after, with what a win pays back.",
        group: "NBA",
        href: "/docs/win-probability",
        label: "Win probability",
      },
      {
        description:
          "One NFL game's live score, with both teams, the quarter, and the clock.",
        group: "NFL",
        label: "Scoreboard",
      },
      {
        description:
          "One division's table, with each team's record, division record, and streak.",
        group: "NFL",
        label: "Standings",
      },
      {
        description:
          "One player's number, position, and season stats, with his team now.",
        group: "NFL",
        label: "Player",
      },
      {
        description:
          "One MLB game's live score, with both teams, the inning, and the count.",
        group: "MLB",
        label: "Scoreboard",
      },
      {
        description:
          "One division's table, with each team's record, games behind, and recent form.",
        group: "MLB",
        label: "Standings",
      },
      {
        description:
          "One player's number, position, and season averages, with his team now.",
        group: "MLB",
        label: "Player",
      },
      {
        description:
          "One fight night's card, with each bout's fighters, weight class, and result.",
        group: "MMA",
        label: "Fight card",
      },
      {
        description: "One fighter's record, reach, stance, and recent fights.",
        group: "MMA",
        label: "Fighter",
      },
      {
        description:
          "One weight class's rankings, with each fighter's record and last fight.",
        group: "MMA",
        label: "Rankings",
      },
      {
        description:
          "One NHL game's live score, with both teams, the period, and the clock.",
        group: "NHL",
        label: "Scoreboard",
      },
      {
        description:
          "One soccer match's live score, with both teams, the minute, and the scorers.",
        group: "Soccer",
        label: "Scoreboard",
      },
    ],
    kind: "cards",
    label: "Sports",
  },
  {
    items: [
      {
        description:
          "Temperature, conditions, and the next six hours, over a sky drawn for the sun and the weather there.",
        href: "/docs/weather",
        label: "Weather",
      },
      {
        description:
          "A boarding pass from the flight number, and a travel assistant that books flights and checks you in.",
        href: "/docs/flights",
        label: "Flights",
      },
      {
        description: "A hotel's photos, nightly price, and rating.",
        label: "Hotel",
      },
      {
        description: "A trip's flights, stays, and plans on one timeline.",
        label: "Itinerary",
      },
      {
        description:
          "Converts units, and currencies at the current exchange rate.",
        label: "Converter",
      },
      {
        description:
          "Ingredients, a step-by-step cooking mode, and nutrition facts.",
        label: "Recipe",
      },
      {
        description: "Headlines on a topic, each with its source and time.",
        label: "News",
      },
      {
        description: "A title card with where to stream it.",
        label: "Movie & TV",
      },
      {
        description: "A repository's stars, open issues, and latest release.",
        label: "GitHub repo",
      },
      {
        description:
          "A package's latest version, weekly downloads, and install size.",
        label: "npm package",
      },
    ],
    kind: "cards",
    label: "Everyday & travel",
  },
  {
    items: [
      {
        description:
          "A filled chart for any chartable question, researched on the web, with an optional range switch and one tab per subject.",
        href: "/docs/area-chart",
        label: "Area Chart",
      },
      {
        description:
          "One bar per category for any comparison, researched on the web: countries, states, companies, or sources.",
        href: "/docs/bar-chart",
        label: "Bar Chart",
      },
      {
        description:
          "A donut for how one whole splits into its parts, like an electricity mix or market share, researched on the web.",
        href: "/docs/pie-chart",
        label: "Pie Chart",
      },
      {
        description:
          "One to three subjects profiled across the same measures on one web, like countries on a well-being index.",
        href: "/docs/radar-chart",
        label: "Radar Chart",
      },
      {
        description:
          "A few items as rings against the same full mark, like reservoir levels or renewable shares.",
        href: "/docs/radial-chart",
        label: "Radial Chart",
      },
    ],
    kind: "cards",
    label: "Charts",
  },
];

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

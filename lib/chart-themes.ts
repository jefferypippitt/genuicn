/**
Every chart card draws in its own color, so a reply with several charts never reads as one wall of blue. Each theme is one hue in a few shades, written out as whole Tailwind classes so they survive the build. All of them set the text color: a card paints with `currentColor` (`bg-current`, `stroke="currentColor"`), so one class colors a bar, a line, a ring or a swatch.

Green and red stay out of every theme: the cards keep them for good and bad news (a rise, a loss, a negative bar).
*/
export interface ChartTheme {
  /**
  The leading mark: the top bar, the line, the biggest slice, the first subject.
  */
  solid: string;
  /**
  Everything behind the leader, a step quieter (usually hatched).
  */
  soft: string;
  /**
  Six steps from strongest to faintest, for marks that need telling apart by shade alone (pie slices). In dark mode the strongest is the lightest, so it still leads.
  */
  ramp: readonly [string, string, string, string, string, string];
}

export const CHART_THEMES = {
  /**
  Area chart: indigo, a deep line that reads as history.
  */
  area: {
    ramp: [
      "text-indigo-700 dark:text-indigo-300",
      "text-indigo-600 dark:text-indigo-400",
      "text-indigo-500 dark:text-indigo-500",
      "text-indigo-400 dark:text-indigo-600",
      "text-indigo-300 dark:text-indigo-700",
      "text-indigo-200 dark:text-indigo-800",
    ],
    soft: "text-indigo-500/80 dark:text-indigo-400/70",
    solid: "text-indigo-600 dark:text-indigo-400",
  },
  /**
  Bar chart: amber, warm and loud for a ranking.
  */
  bar: {
    ramp: [
      "text-amber-700 dark:text-amber-300",
      "text-amber-600 dark:text-amber-400",
      "text-amber-500 dark:text-amber-500",
      "text-amber-400 dark:text-amber-600",
      "text-amber-300 dark:text-amber-700",
      "text-amber-200 dark:text-amber-800",
    ],
    soft: "text-amber-500/85 dark:text-amber-400/70",
    solid: "text-amber-500 dark:text-amber-400",
  },
  /**
  Pie chart: violet, with the widest ramp, since its slices are told apart by shade.
  */
  pie: {
    ramp: [
      "text-violet-700 dark:text-violet-300",
      "text-violet-600 dark:text-violet-400",
      "text-violet-500 dark:text-violet-500",
      "text-violet-400 dark:text-violet-600",
      "text-violet-300 dark:text-violet-700",
      "text-violet-200 dark:text-violet-800",
    ],
    soft: "text-violet-500/80 dark:text-violet-400/70",
    solid: "text-violet-600 dark:text-violet-400",
  },
  /**
  Radar chart: teal, cool against the ink outlines of the other subjects.
  */
  radar: {
    ramp: [
      "text-teal-700 dark:text-teal-300",
      "text-teal-600 dark:text-teal-400",
      "text-teal-500 dark:text-teal-500",
      "text-teal-400 dark:text-teal-600",
      "text-teal-300 dark:text-teal-700",
      "text-teal-200 dark:text-teal-800",
    ],
    soft: "text-teal-500/80 dark:text-teal-400/70",
    solid: "text-teal-600 dark:text-teal-400",
  },
  /**
  Radial chart: rose, bright enough to carry thin rings.
  */
  radial: {
    ramp: [
      "text-rose-700 dark:text-rose-300",
      "text-rose-600 dark:text-rose-400",
      "text-rose-500 dark:text-rose-500",
      "text-rose-400 dark:text-rose-600",
      "text-rose-300 dark:text-rose-700",
      "text-rose-200 dark:text-rose-800",
    ],
    soft: "text-rose-500/80 dark:text-rose-400/70",
    solid: "text-rose-500 dark:text-rose-400",
  },
} as const satisfies Record<string, ChartTheme>;

export type ChartThemeName = keyof typeof CHART_THEMES;

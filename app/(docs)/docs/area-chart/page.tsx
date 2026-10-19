import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import solarRun from "@/content/recordings/area-chart-solar.json";
import temperatureRun from "@/content/recordings/area-chart-temperature.json";
import worldRun from "@/content/recordings/area-chart-world.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A filled area chart for any chartable question. The model writes a free-text topic, the card searches online for real public data using Parallel, and draws the series.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Area Chart · genuicn",
};

const RUNS = [
  {
    label: "What is the current world population",
    recording: worldRun as ChatRecording,
  },
  {
    label: "How much of US electricity comes from solar?",
    recording: solarRun as ChatRecording,
  },
  {
    label: "How has global temperature changed?",
    recording: temperatureRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { areaChartCatalogEntry } from "@/features/area-chart/area-chart-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    AreaChartCard: areaChartCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LiveAreaChartCard } from "@/features/area-chart/components/live-area-chart-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    AreaChartCard: ({ props, loading }) => (
      <LiveAreaChartCard
        topic={props.topic || undefined}
        range={props.range ?? undefined}
        ranges={props.ranges ?? false}
        compare={props.compare ?? undefined}
        streaming={loading}
      />
    ),
  },
});`;
/* eslint-enable unicorn/no-incorrect-template-string-interpolation */

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card, so the topic fills in as it arrives.",
  ],
  ["Loading.", "The card is researching the web for a numeric time series."],
  [
    "Ready.",
    "Latest value, change over the window, and a filled area chart. When the model sets ranges to true, the 10Y/25Y/50Y/Max switch filters the series without another search.",
  ],
  [
    "Error.",
    "No honest series was found for the topic, or Parallel / the gateway didn't answer.",
  ],
] as const;

function renderState([name, detail]: (typeof STATES)[number]) {
  return (
    <li key={name}>
      <span style={{ fontVariationSettings: fontWeights.semibold }}>
        {name}
      </span>{" "}
      {detail}
    </li>
  );
}

export default function AreaChartPage() {
  return (
    <DocPage
      title="Area Chart"
      href="/docs/area-chart"
      description={DESCRIPTION}
      install={{
        card: "area-chart",
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to chart anything with a numeric trend over time…"
        />
      </DocSection>

      <DocSection title="States">
        <p>
          The card has a state for each step, from the model writing it to the
          series arriving:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STATES.map(renderState)}
        </ul>
      </DocSection>
    </DocPage>
  );
}

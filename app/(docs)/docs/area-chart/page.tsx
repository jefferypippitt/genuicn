import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import solarRun from "@/content/recordings/area-chart-solar.json";
import temperatureRun from "@/content/recordings/area-chart-temperature.json";
import worldRun from "@/content/recordings/area-chart-world.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that charts a trend over time for any topic. The model writes the topic, the card searches the web for real public data with Parallel, and then the card draws a filled area chart.";

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
    "The model is still writing the card. The topic appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is searching the web for a series of numbers over time.",
  ],
  [
    "Ready.",
    "The card shows the latest value, the change over the period, and a filled area chart. When the model sets ranges to true, a switch for 10Y, 25Y, 50Y, and Max filters the series without a new search.",
  ],
  [
    "Error.",
    "The search found no reliable series for the topic, or Parallel or the AI Gateway did not respond.",
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
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to chart anything with a numeric trend over time…"
        />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the search has finished.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STATES.map(renderState)}
        </ul>
      </DocSection>
    </DocPage>
  );
}

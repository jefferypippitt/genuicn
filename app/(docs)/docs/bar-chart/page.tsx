import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import economiesRun from "@/content/recordings/bar-chart-economies.json";
import electricityRun from "@/content/recordings/bar-chart-electricity.json";
import statesRun from "@/content/recordings/bar-chart-states.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A bar chart for any comparison across categories. The model writes a free-text topic, the card searches online for real public figures using Parallel, and draws one bar per category.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Bar Chart · genuicn",
};

const RUNS = [
  {
    label: "Which countries have the largest economies?",
    recording: economiesRun as ChatRecording,
  },
  {
    label: "What are the 5 most populous US states?",
    recording: statesRun as ChatRecording,
  },
  {
    label: "How is US electricity generated, by source?",
    recording: electricityRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { barChartCatalogEntry } from "@/features/bar-chart/bar-chart-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    BarChartCard: barChartCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LiveBarChartCard } from "@/features/bar-chart/components/live-bar-chart-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    BarChartCard: ({ props, loading }) => (
      <LiveBarChartCard
        topic={props.topic || undefined}
        limit={props.limit ?? undefined}
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
  [
    "Loading.",
    "The card is researching the web for one figure per category, holding a row for each bar it asked for.",
  ],
  [
    "Ready.",
    "The biggest value, or the total when the bars are parts of one whole, then one bar per category with its value, biggest first unless the categories have their own order.",
  ],
  [
    "Error.",
    "No honest figures were found for the topic, or Parallel / the gateway didn't answer.",
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

export default function BarChartPage() {
  return (
    <DocPage
      title="Bar Chart"
      href="/docs/bar-chart"
      description={DESCRIPTION}
      install={{
        card: "bar-chart",
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to compare anything across countries, states, or categories…"
        />
      </DocSection>

      <DocSection title="States">
        <p>
          The card has a state for each step, from the model writing it to the
          figures arriving:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STATES.map(renderState)}
        </ul>
      </DocSection>
    </DocPage>
  );
}

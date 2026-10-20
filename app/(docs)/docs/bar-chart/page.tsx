import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import economiesRun from "@/content/recordings/bar-chart-economies.json";
import electricityRun from "@/content/recordings/bar-chart-electricity.json";
import statesRun from "@/content/recordings/bar-chart-states.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that compares one figure across categories, for any topic. The model writes the topic, the card searches the web for real public figures with Parallel, and then the card draws one bar for each category.";

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
    "The model is still writing the card. The topic appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is searching the web for one figure for each category. One empty row for each bar keeps the card at its full height.",
  ],
  [
    "Ready.",
    "The card shows the biggest value, or the total when the bars are parts of one whole. Under it is one bar for each category, with its value. The bars go from biggest to smallest, unless the categories have their own order.",
  ],
  [
    "Error.",
    "The search found no reliable figures for the topic, or Parallel or the AI Gateway did not respond.",
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
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to compare anything across countries, states, or categories…"
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

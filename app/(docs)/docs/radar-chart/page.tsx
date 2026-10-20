import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import aiModelsRun from "@/content/recordings/radar-chart-ai-models.json";
import camerasRun from "@/content/recordings/radar-chart-cameras.json";
import nutritionRun from "@/content/recordings/radar-chart-nutrition.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that compares one to three subjects on the same measures, for any topic. The model writes the topic, the card searches the web for real public figures with Parallel, and then the card draws one shape for each subject on a shared web.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Radar Chart · genuicn",
};

const RUNS = [
  {
    label: "Compare the nutrition of an apple and a banana",
    recording: nutritionRun as ChatRecording,
  },
  {
    label: "Compare the top AI models on benchmarks",
    recording: aiModelsRun as ChatRecording,
  },
  {
    label: "Compare the iPhone 17 Pro and Pixel 10 Pro camera scores",
    recording: camerasRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { radarChartCatalogEntry } from "@/features/radar-chart/radar-chart-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    RadarChartCard: radarChartCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LiveRadarChartCard } from "@/features/radar-chart/components/live-radar-chart-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    RadarChartCard: ({ props, loading }) => (
      <LiveRadarChartCard topic={props.topic || undefined} streaming={loading} />
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
    "The model has finished the card. The card is searching the web for the score of each subject on each measure.",
  ],
  [
    "Ready.",
    "The card shows a web with one spoke for each measure and one shape for each subject. The first shape is solid teal, and the others are dashed and dotted. Point at a measure to show the value of every subject. Point at a name in the key to bring its shape to the front.",
  ],
  [
    "Error.",
    "The search found fewer than three measures that all the subjects share, or Parallel or the AI Gateway did not respond.",
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

export default function RadarChartPage() {
  return (
    <DocPage
      title="Radar Chart"
      href="/docs/radar-chart"
      description={DESCRIPTION}
      install={{
        card: "radar-chart",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to compare a few things on the same measures…"
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

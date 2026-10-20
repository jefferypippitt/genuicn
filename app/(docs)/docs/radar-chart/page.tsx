import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import aiModelsRun from "@/content/recordings/radar-chart-ai-models.json";
import camerasRun from "@/content/recordings/radar-chart-cameras.json";
import nutritionRun from "@/content/recordings/radar-chart-nutrition.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "One to three subjects profiled across the same measures. The model writes a free-text topic, the card searches online for real public figures using Parallel, and draws one shape per subject on a shared web.";

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
    "The model is still writing the card, so the topic fills in as it arrives.",
  ],
  [
    "Loading.",
    "The card is researching the web for each subject's score on each measure.",
  ],
  [
    "Ready.",
    "A web with one spoke per measure and one shape per subject: the first in solid teal, the others dashed and dotted. Hovering a measure shows every subject's value; hovering a name in the key brings its shape forward.",
  ],
  [
    "Error.",
    "Fewer than three shared measures were found for the topic, or Parallel / the gateway didn't answer.",
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
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask to compare a few things on the same measures…"
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

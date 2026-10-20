import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import cloudRun from "@/content/recordings/pie-chart-cloud.json";
import electricityRun from "@/content/recordings/pie-chart-electricity.json";
import smartphonesRun from "@/content/recordings/pie-chart-smartphones.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "How one whole splits into its parts. The model writes a free-text topic, the card searches online for real public figures using Parallel, and draws a donut, biggest slice first, folding the smallest into Other.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Pie Chart · genuicn",
};

const RUNS = [
  {
    label: "What's the US electricity mix by source?",
    recording: electricityRun as ChatRecording,
  },
  {
    label: "Global smartphone market share by vendor",
    recording: smartphonesRun as ChatRecording,
  },
  {
    label: "Who has the most cloud infrastructure market share?",
    recording: cloudRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { pieChartCatalogEntry } from "@/features/pie-chart/pie-chart-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    PieChartCard: pieChartCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LivePieChartCard } from "@/features/pie-chart/components/live-pie-chart-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    PieChartCard: ({ props, loading }) => (
      <LivePieChartCard topic={props.topic || undefined} streaming={loading} />
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
    "The card is researching the web for the whole and each of its parts.",
  ],
  [
    "Ready.",
    "A donut with one slice per part, biggest first and the smallest folded into Other, beside a legend with each part's value and share. Hovering a slice or a row shows its share in the middle.",
  ],
  [
    "Error.",
    "Fewer than two honest parts were found for the topic, or Parallel / the gateway didn't answer.",
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

export default function PieChartPage() {
  return (
    <DocPage
      title="Pie Chart"
      href="/docs/pie-chart"
      description={DESCRIPTION}
      install={{
        card: "pie-chart",
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how a whole splits up: an energy mix, a market, a budget…"
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

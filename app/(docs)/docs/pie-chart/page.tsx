import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import cloudRun from "@/content/recordings/pie-chart-cloud.json";
import electricityRun from "@/content/recordings/pie-chart-electricity.json";
import smartphonesRun from "@/content/recordings/pie-chart-smartphones.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows how one whole splits into parts, for any topic. The model writes the topic, the card searches the web for real public figures with Parallel, and then the card draws a donut. The biggest slice comes first, and the smallest slices go into Other.";

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
    "The model is still writing the card. The topic appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is searching the web for the whole and each of its parts.",
  ],
  [
    "Ready.",
    "The card shows a donut with one slice for each part, from biggest to smallest, with the smallest parts in Other. Next to the donut, a legend shows the value and share of each part. Point at a slice or a row to show its share in the middle of the donut.",
  ],
  [
    "Error.",
    "The search found fewer than two reliable parts for the topic, or Parallel or the AI Gateway did not respond.",
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
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how a whole splits up: an energy mix, a market, a budget…"
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

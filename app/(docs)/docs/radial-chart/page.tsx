import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import renewablesRun from "@/content/recordings/radial-chart-renewables.json";
import reservoirsRun from "@/content/recordings/radial-chart-reservoirs.json";
import socialRun from "@/content/recordings/radial-chart-social.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that measures a few items against the same full mark, for any topic. The model writes the topic, the card searches the web for real public figures with Parallel, and then the card draws one ring for each item, with the largest on the outside.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Radial Chart · genuicn",
};

const RUNS = [
  {
    label: "How full are California's major reservoirs?",
    recording: reservoirsRun as ChatRecording,
  },
  {
    label:
      "What share of electricity is renewable in Germany, the UK, France and the US?",
    recording: renewablesRun as ChatRecording,
  },
  {
    label: "What percent of US adults use each social media platform?",
    recording: socialRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { radialChartCatalogEntry } from "@/features/radial-chart/radial-chart-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    RadialChartCard: radialChartCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LiveRadialChartCard } from "@/features/radial-chart/components/live-radial-chart-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    RadialChartCard: ({ props, loading }) => (
      <LiveRadialChartCard topic={props.topic || undefined} streaming={loading} />
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
    "The model has finished the card. The card is searching the web for the level of each item and for the value of a full ring.",
  ],
  [
    "Ready.",
    "The card shows one ring for each item, with the largest on the outside. Each ring fills to its share of the full mark, and its name and value sit where the ring starts. Point at a ring to bring it to the front.",
  ],
  [
    "Error.",
    "The search found fewer than two reliable figures for the topic, or Parallel or the AI Gateway did not respond.",
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

export default function RadialChartPage() {
  return (
    <DocPage
      title="Radial Chart"
      href="/docs/radial-chart"
      description={DESCRIPTION}
      install={{
        card: "radial-chart",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how full or how far along a few things are…"
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

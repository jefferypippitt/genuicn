import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import renewablesRun from "@/content/recordings/radial-chart-renewables.json";
import reservoirsRun from "@/content/recordings/radial-chart-reservoirs.json";
import socialRun from "@/content/recordings/radial-chart-social.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A few items measured against the same full mark. The model writes a free-text topic, the card searches online for real public figures using Parallel, and winds one ring per item, the largest outermost.";

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
    "The model is still writing the card, so the topic fills in as it arrives.",
  ],
  [
    "Loading.",
    "The card is researching the web for each item's level and what a full ring means.",
  ],
  [
    "Ready.",
    "One ring per item, the largest outermost, each filled to its share of the full mark, with its name and value where the ring starts. Hovering a ring brings it forward.",
  ],
  [
    "Error.",
    "Fewer than two honest figures were found for the topic, or Parallel / the gateway didn't answer.",
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
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how full or how far along a few things are…"
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

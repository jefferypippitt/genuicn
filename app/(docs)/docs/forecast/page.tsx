import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import austinRun from "@/content/recordings/forecast-austin.json";
import multiRun from "@/content/recordings/forecast-multi.json";
import seattleRun from "@/content/recordings/forecast-seattle.json";
import { fontWeights } from "@/lib/font-weight";
import ViewGallery from "./view-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows the weather ahead for one place. The Hourly view shows the next 24 hours with the chance of rain. The 10-day view shows the high and low of each day, and a switch changes the view.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Forecast · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The place appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the forecast from Open-Meteo. Empty rows in the shape of the view keep the card at its full height.",
  ],
  [
    "Ready.",
    "The header shows the place, the region, and the weather now. The Hourly view shows every second hour of the next 24, with the temperature, and with the chance of rain when that chance is 20% or more. The 10-day view shows one row for each day, with a bar from the low to the high on one scale for all ten days. A dot on the first bar shows the temperature now. The switch changes the view without a new request.",
  ],
  [
    "Error.",
    "Open-Meteo has no place with that name, or Open-Meteo did not respond. The card shows the reason.",
  ],
] as const;

const ROUTING = [
  [
    "This card.",
    `Questions about weather that has not happened yet, such as "Will it rain in Seattle this afternoon?", "What should I pack for Denver next week?", and "Is it going to snow in Boston on Friday?"`,
  ],
  [
    "The Weather card.",
    `Questions about the weather now, such as "What's the weather in Austin?", "Is it raining in Seattle right now?", and "How hot is it in Phoenix?"`,
  ],
] as const;

const RUNS = [
  { label: "Austin weekend", recording: austinRun as ChatRecording },
  { label: "Seattle rain", recording: seattleRun as ChatRecording },
  { label: "Two cities", recording: multiRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { forecastCatalogEntry } from "@/features/forecast/forecast-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    ForecastCard: forecastCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveForecastCard } from "@/features/forecast/components/live-forecast-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    ForecastCard: ({ props, loading }) => (
      <LiveForecastCard
        location={props.location || undefined}
        units={props.units}
        view={props.view ?? "daily"}
        streaming={loading}
      />
    ),
  },
});

// app/chat/page.tsx: the page composes, Chat is the client leaf
import { Chat } from "@/features/chat/components/chat";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-svh w-full max-w-2xl flex-col">
      <Chat className="flex-1" />
    </main>
  );
}`;
/* eslint-enable unicorn/no-incorrect-template-string-interpolation */

const List = ({
  items,
}: {
  readonly items: readonly (readonly [string, string])[];
}) => (
  <ul className="flex list-disc flex-col gap-1 pl-5">
    {items.map(([name, detail]) => (
      <li key={name}>
        <span style={{ fontVariationSettings: fontWeights.semibold }}>
          {name}
        </span>{" "}
        {detail}
      </li>
    ))}
  </ul>
);

export default function ForecastDocument() {
  return (
    <DocPage
      title="Forecast"
      href="/docs/forecast"
      description={DESCRIPTION}
      install={{
        card: "forecast",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about the weather ahead…"
        />
      </DocSection>

      <DocSection title="Each view answers a different question">
        <ViewGallery />
      </DocSection>

      <DocSection title="The question picks the card">
        <p>
          People rarely ask for a forecast by name. The model checks when the
          weather in the question takes place, then follows the rule in{" "}
          <code className="font-mono">forecast-catalog.ts</code>. Each kind of
          question gets one card:
        </p>
        <List items={ROUTING} />
        <p>
          The model also opens the card on the view that fits the question.
          &quot;This afternoon&quot;, &quot;tonight&quot;, and &quot;when does
          the rain stop&quot; open Hourly. &quot;Tomorrow&quot;, &quot;the
          weekend&quot;, and &quot;next week&quot; open 10-day. A question
          without a time opens 10-day.
        </p>
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the forecast has arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

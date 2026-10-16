import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import appleRun from "@/content/recordings/quote-apple.json";
import nvdaRun from "@/content/recordings/quote-nvda.json";
import teslaRun from "@/content/recordings/quote-tesla.json";
import multiRun from "@/content/recordings/quote-multi.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "Price, change, and a small trend line with a 1D, 1W, 1M, and 1Y switch.";

export const metadata: Metadata = {
  title: "Quote · genuicn",
  description: DESCRIPTION,
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card, so the ticker fills in as it arrives.",
  ],
  ["Loading.", "The card is complete and the quote is on its way."],
  [
    "Ready.",
    "Price, change, and the trend line. The range switch redraws the trend line on the card.",
  ],
  ["Error.", "The ticker wasn't found, or the quote service didn't answer."],
] as const;

const RUNS = [
  { label: "NVDA today", recording: nvdaRun as ChatRecording },
  { label: "Apple, past year", recording: appleRun as ChatRecording },
  { label: "Tesla, this week", recording: teslaRun as ChatRecording },
  { label: "NVDA, Apple, Tesla", recording: multiRun as ChatRecording },
];

const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { quoteCatalogEntry } from "@/features/quote/quote-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    QuoteCard: quoteCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    QuoteCard: ({ props, loading }) => (
      <LiveQuoteCard
        ticker={props.ticker}
        range={props.range ?? "1d"}
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

export default function QuoteDocument() {
  return (
    <DocPage
      title="Quote"
      href="/docs/quote"
      description={DESCRIPTION}
      install={{
        card: "quote",
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a stock…"
        />
      </DocSection>

      <DocSection title="States">
        <p>
          The card has a state for each step, from the model writing it to the
          quote arriving:
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

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

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
  "A card that shows where a stock stands: the price, the change over the range, and a small trend line, with a switch for 1D, 1W, 1M, and 1Y.";

export const metadata: Metadata = {
  title: "Quote · genuicn",
  description: DESCRIPTION,
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The ticker appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the quote from Yahoo Finance.",
  ],
  [
    "Ready.",
    "The card shows the price, the change, and the trend line. The range switch redraws the trend line.",
  ],
  [
    "Error.",
    "Yahoo Finance has no ticker with that symbol, or Yahoo Finance did not respond.",
  ],
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
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a stock…"
        />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the quote has arrived.
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

import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import btcRun from "@/content/recordings/crypto-btc.json";
import ethRun from "@/content/recordings/crypto-eth.json";
import multiRun from "@/content/recordings/crypto-multi.json";
import { fontWeights } from "@/lib/font-weight";
import RangeGallery from "./range-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows the live price, change, market cap, and volume of a coin, with a price line and a switch for 24H, 1W, 1M, 1Y, and All.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Crypto · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The symbol appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the price from CoinGecko.",
  ],
  [
    "Ready.",
    "The card shows the price, the change, the market cap, the volume, and the price line. The range switch redraws the line and the change. The All range starts the line at the week the coin first traded. To read the price at one point, point at the line, drag across it, or focus the line and press the arrow keys.",
  ],
  [
    "Error.",
    "CoinGecko has no coin with that symbol, or CoinGecko did not respond. If CoinGecko is busy and the card has an earlier answer, the card keeps that answer and shows no error.",
  ],
] as const;

const RUNS = [
  { label: "Bitcoin", recording: btcRun as ChatRecording },
  { label: "Ethereum", recording: ethRun as ChatRecording },
  { label: "Three coins", recording: multiRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { cryptoCatalogEntry } from "@/features/crypto/crypto-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    CryptoCard: cryptoCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveCryptoCard } from "@/features/crypto/components/live-crypto-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    CryptoCard: ({ props, loading }) => (
      <LiveCryptoCard
        symbol={props.symbol || undefined}
        range={props.range ?? "24h"}
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

export default function CryptoDocument() {
  return (
    <DocPage
      title="Crypto"
      href="/docs/crypto"
      description={DESCRIPTION}
      install={{
        card: "crypto",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a coin…"
        />
      </DocSection>

      <DocSection title="Each range sets how far back the line goes">
        <RangeGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the price has arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

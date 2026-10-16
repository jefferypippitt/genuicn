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
  "A card with a coin's live price, change, market cap, and volume, and a price line you switch between 24H, 1W, 1M, 1Y, and All.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Crypto · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The symbol appears as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the price request is in flight.",
  ],
  [
    "Ready.",
    "The card shows the price, change, market cap, volume, and price line. The range switch redraws the line and the change. All starts the line at the week the coin first traded. To read the price at a point, point at the line, drag across it, or focus it and press the arrow keys.",
  ],
  [
    "Error.",
    "CoinGecko has no coin with that symbol, or CoinGecko didn't answer. A busy CoinGecko shows the error only when the card has no earlier answer to fall back on.",
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

      <DocSection title="Ranges">
        <p>
          Each tab shows six coins over one range. The prices, market caps, and
          volumes are CoinGecko&apos;s figures from October 16, 2026. The lines
          leading up to them are generated, so they don&apos;t match the real
          history.
        </p>
        <RangeGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          price arrives.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

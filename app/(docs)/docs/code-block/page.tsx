import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import pythonRun from "@/content/recordings/code-block-python.json";
import zodRun from "@/content/recordings/code-block-zod.json";
import tailwindRun from "@/content/recordings/code-tailwind-vite.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card for the code the model writes: highlighted for its language, with line numbers, called-out lines, and a copy button.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Code block · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the code. The code shows as plain text with a cursor at the end, and the copy button stays off until the model finishes.",
  ],
  [
    "Ready.",
    "The code is highlighted for its language. Code longer than 20 lines folds, with a button to show the rest.",
  ],
] as const;

const RUNS = [
  { label: "A zod schema", recording: zodRun as ChatRecording },
  { label: "Hello world in Python", recording: pythonRun as ChatRecording },
  {
    label: "Tailwind in Vite, with a terminal",
    recording: tailwindRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { codeBlockCatalogEntry } from "@/features/code-block/code-block-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    CodeBlockCard: codeBlockCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import CodeBlockCard from "@/features/code-block/components/code-block-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    CodeBlockCard: ({ props, loading }) => (
      <CodeBlockCard
        code={props.code}
        language={props.language}
        filename={props.filename}
        highlight={props.highlight}
        streaming={loading}
      />
    ),
  },
});`;
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

export default function CodeBlockDocument() {
  return (
    <DocPage
      title="Code block"
      href="/docs/code-block"
      description={DESCRIPTION}
      install={{
        card: "code-block",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask for some code…"
        />
      </DocSection>

      <DocSection title="The card has two states">
        <p>
          The model writes the code itself, so there is nothing to load. The
          state depends on whether the model has finished writing.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

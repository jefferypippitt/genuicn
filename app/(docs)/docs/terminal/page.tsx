import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import tailwindRun from "@/content/recordings/code-tailwind-vite.json";
import gitRun from "@/content/recordings/terminal-git.json";
import nextRun from "@/content/recordings/terminal-next.json";
import windowsRun from "@/content/recordings/terminal-windows.json";
import { fontWeights } from "@/lib/font-weight";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A terminal window for the commands the model tells you to run. It lists them in order, each with a copy button, and shows what a command prints when the output helps.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Terminal · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the commands. Each command appears at its prompt as the model writes it, with the cursor after the last one. A finished command gets its copy button right away.",
  ],
  [
    "Ready.",
    "The copy button in the header turns on and copies every command at once.",
  ],
] as const;

const RUNS = [
  { label: "A new Next.js app", recording: nextRun as ChatRecording },
  { label: "Undo a git commit", recording: gitRun as ChatRecording },
  { label: "Node on Windows", recording: windowsRun as ChatRecording },
  {
    label: "Tailwind in Vite, with code",
    recording: tailwindRun as ChatRecording,
  },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { terminalCatalogEntry } from "@/features/terminal/terminal-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    TerminalCard: terminalCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import TerminalCard from "@/features/terminal/components/terminal-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    TerminalCard: ({ props, loading }) => (
      <TerminalCard
        steps={props.steps}
        shell={props.shell}
        cwd={props.cwd}
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

export default function TerminalDocument() {
  return (
    <DocPage
      title="Terminal"
      href="/docs/terminal"
      description={DESCRIPTION}
      install={{
        card: "terminal",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how to run something…"
        />
      </DocSection>

      <DocSection title="The card has two states">
        <p>
          The model writes the commands itself, so there is nothing to load. The
          state depends on whether the model has finished writing.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}

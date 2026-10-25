import {
  DocDivider,
  DocPage,
  DocSection,
  DocStep,
} from "@/components/docs/doc-page";
import { CopyCommand, InstallCommand } from "@/components/docs/install-command";
import { fontWeights } from "@/lib/font-weight";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const DESCRIPTION =
  "Install the chat once, add your AI Gateway key, then add cards with the shadcn CLI.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Installation · genuicn",
};

const CODE_BLOCK_CLASS =
  "bg-muted/60 text-muted-foreground w-fit max-w-full overflow-x-auto rounded-lg px-4 py-3 text-xs";

const CHAT_FILES: readonly (readonly [string, ReactNode])[] = [
  [
    "app/api/chat/route.ts",
    "is the chat endpoint. It sends the conversation to the model through Vercel AI Gateway.",
  ],
  [
    "app/chat/page.tsx",
    <>
      renders a full-page chat at <code className="font-mono">/chat</code>.
    </>,
  ],
  [
    "features/chat/components/",
    <>
      holds the chat UI, built on Fluid Functionalism, and{" "}
      <code className="font-mono">CardGroup</code>, which lets a reply show
      several cards.
    </>,
  ],
  ["features/chat/chat-catalog.ts", "lists the cards the model may show."],
  [
    "features/chat/chat-registry.tsx",
    "maps each card to the component that renders it.",
  ],
  ["features/chat/chat-steps.ts", "lists the thinking steps for each card."],
];

const CREDITED_SOURCES: readonly (readonly [string, string])[] = [
  [
    "Weather and Forecast",
    "use Open-Meteo. Its free API is for non-commercial use only. The data is under CC BY 4.0, so credit Open-Meteo with a link to open-meteo.com.",
  ],
  [
    "Crypto",
    "uses CoinGecko and Kraken. CoinGecko's free plan asks you to credit CoinGecko with a link.",
  ],
  [
    "Area chart",
    "uses World Bank data, which is under CC BY 4.0. Credit the World Bank.",
  ],
];

const UNOFFICIAL_SOURCES: readonly (readonly [string, string])[] = [
  ["Quote and Candlestick", "use Yahoo Finance."],
  ["Scoreboard, Standings, Player, and Win probability", "use ESPN."],
  ["NBA Cup", "uses NBA Stats."],
];

function renderSource([cards, detail]: readonly [string, string]) {
  return (
    <li key={cards}>
      <span
        className="text-foreground"
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {cards}
      </span>{" "}
      {detail}
    </li>
  );
}

function renderChatFile([name, detail]: (typeof CHAT_FILES)[number]) {
  return (
    <li key={name}>
      <code
        className="text-foreground font-mono"
        style={{ fontVariationSettings: fontWeights.normal }}
      >
        {name}
      </code>{" "}
      {detail}
    </li>
  );
}

export default function InstallationPage() {
  return (
    <DocPage
      title="Installation"
      href="/docs/installation"
      description={DESCRIPTION}
      install={{
        card: "chat",
        note: "Copy a prompt that runs this setup.",
        title: "With a coding agent",
      }}
    >
      <DocSection title="Requirements">
        <p className="text-muted-foreground">
          A Next.js app with Tailwind CSS v4 and shadcn/ui. If the app
          doesn&apos;t use shadcn yet, set it up first:
        </p>
        <CopyCommand command="npx shadcn@latest init" />
      </DocSection>

      <DocDivider />

      <DocSection title="Setup">
        <DocStep number={1} label="Install the chat once per project:">
          <InstallCommand item="chat" flags="--overwrite" />
        </DocStep>
        <DocStep
          number={2}
          label={
            <>
              Add your key to <code className="font-mono">.env.local</code>:
            </>
          }
        >
          <pre className={CODE_BLOCK_CLASS}>
            <code>AI_GATEWAY_API_KEY=your-key</code>
          </pre>
        </DocStep>
        <DocStep number={3} label="Install any card:">
          <InstallCommand item="quote" />
        </DocStep>
        <DocDivider className="mt-4" />
        <p className="text-muted-foreground">
          The CLI installs the npm packages and shadcn components the chat or
          the card depends on.
        </p>
        <p className="text-muted-foreground">
          The <code className="font-mono">--overwrite</code> flag lets the
          install replace stock shadcn files with the same name, like{" "}
          <code className="font-mono">button.tsx</code>. If you&apos;ve
          customized those files, leave the flag off and review them.
        </p>
        <p className="text-muted-foreground">
          Get a key from the Vercel dashboard under AI Gateway, API Keys, then
          open <code className="font-mono">/chat</code>. The chat uses{" "}
          <code className="font-mono">anthropic/claude-haiku-5.5</code> by
          default. To use another model, set{" "}
          <code className="font-mono">AI_GATEWAY_MODEL</code> to any AI Gateway
          model ID.
        </p>
        <p className="text-muted-foreground">
          Installing a card adds its API route and fake data. The Copy prompt on
          the card&apos;s page has the lines that turn it on in the catalog, the
          registry, and the thinking steps.
        </p>
      </DocSection>

      <DocDivider />

      <DocSection title="What the chat adds">
        <p className="text-muted-foreground">
          Installing the chat adds these files:
        </p>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5">
          {CHAT_FILES.map(renderChatFile)}
        </ul>
      </DocSection>

      <DocDivider />

      <DocSection title="Public apps need bot protection">
        <p className="text-muted-foreground">
          The chat route and the chart card routes call a model with your key.
          The chart routes also use your Parallel key. Anyone who can reach
          these routes can spend your credits.
        </p>
        <p className="text-muted-foreground">
          Before you deploy a public app, protect these routes. On Vercel, use{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="https://vercel.com/docs/botid"
            rel="noopener noreferrer"
            target="_blank"
          >
            BotID
          </a>
          . On other hosts, add a rate limit.
        </p>
      </DocSection>

      <DocDivider />

      <DocSection title="Check the terms of each data source">
        <p className="text-muted-foreground">
          Each card fetches its data from a free public service. Some of these
          services ask for credit:
        </p>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5">
          {CREDITED_SOURCES.map(renderSource)}
        </ul>
        <p className="text-muted-foreground">
          These cards call endpoints that have no public API:
        </p>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5">
          {UNOFFICIAL_SOURCES.map(renderSource)}
        </ul>
        <p className="text-muted-foreground">
          These endpoints can change or block requests without notice, and their
          terms may not allow this use. For a production app, replace the fetch
          in the card&apos;s <code className="font-mono">-queries.ts</code> file
          with a licensed data provider. Team, airline, and company logos belong
          to their owners.
        </p>
      </DocSection>
    </DocPage>
  );
}

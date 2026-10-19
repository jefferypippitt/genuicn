# genuicn: Project Spec

**One line:** shadcn for chatbot cards. Install one card and your chatbot can show it right away.

## The idea

When a user asks a chatbot "what's the weather in Austin?" or "how's NVDA doing?", the model calls a tool. Most chat apps show that result as text or a bare JSON box. genuicn is a shadcn registry of ready-made generative UI cards that render inside the chat whenever a tool runs.

Each card is a complete unit you install with one shadcn CLI command:

- **The card**, styled with your shadcn theme.
- **The tool definition**: a typed input schema plus a description, so the model knows when to call it.
- **A data fetcher** that uses a free public API, plus a fake-data version for demos and tests.
- **Every state designed**: input still streaming, loading, done, and error.
- **Actions**: buttons on the card send the user's choice back to the model, so the conversation keeps going.
- **A short text summary**, so the model (or a voice reader) can describe what the card showed.

## Card catalog

The plan lives in one place, `components/sidebar-app/nav-data.ts`, and the site renders it at `/roadmap`. That file lists every card by topic (Finance, Sports, Everyday & travel, Charts) with a one-line description. Shipped cards have an `href`.

The sidebar shows only items with an `href`, and the roadmap shows only the cards without one. To ship a card, build it, add it to `registry.json`, give it a docs page, and add its `href` in `nav-data.ts`. The sidebar and the roadmap both update from that one change.

Planned additions to shipped cards stay here, since the roadmap lists only new cards. Weather still needs a 10-day forecast, radar and air quality.

## Why genuicn beats the competition

Research done Oct 13–14, 2026 across the shadcn directory (443 registries), GitHub, npm and the projects' own registry files.

| Competitor | What it ships | What it's missing |
| --- | --- | --- |
| ai-elements (Vercel) | ~30 chat parts, one generic tool component | No subject cards |
| tool-ui | ~140 chat/agent parts: chart, table, map, link preview, option list | No weather, stock, sports or travel cards |
| manifest | ~32 cards for shopping, events and social posts | ChatGPT Apps only; no finance, sports or travel |
| pastaui, scrimui, agentui, inferencesh | Chat and agent interfaces, generic tool rendering | No subject cards |
| wigggle-ui, wxcn | Nice static weather, stock, sports and calendar widgets | Not connected to tools or chat at all |
| assistant-ui | Weather and stock tool UIs as docs examples | Not installable |

What makes genuicn different:

1. **Complete cards, not just visuals.** No kit found ships the card, tool definition, data fetcher and all states together for subject cards.
2. **Cards that fill in as the model streams.** Nothing found for subject cards.
3. **Clickable cards that talk back to the model.** Partly done by manifest and tool-ui, but not for finance, sports or travel.
4. **One card, three chat setups:** Vercel AI SDK, assistant-ui, and MCP/ChatGPT Apps. Every competitor found supports only one.
5. **A playground** where every card replays a realistic fake chat.

Positioning: competitors give you the chat; genuicn gives you what goes inside it.

## Name check (Oct 14, 2026)

`genuicn` is not in the shadcn directory, not taken on npm, and no GitHub repo uses it in its name. Domain not checked yet.

## Caveats

"Nothing found" means our searches came up empty, not that nothing exists. GitHub search covered repo names and descriptions only. Re-check tool-ui and manifest before launch, since both are active.

## Status (Oct 15, 2026)

- **Shipped:** the `chat` foundation block and two cards. `quote` has price, change, trend line, a 1D/1W/1M/1Y switch, live data, and a fake-data version. `weather` has current conditions, the next six hours, and an animated sky for the time of day and the weather, with live data from Open-Meteo and a fake-data version.
- **Site:** Introduction (`/docs`), Installation (`/docs/installation`), Quote (`/docs/quote`) and Weather (`/docs/weather`) with chat playgrounds, and a monthly changelog (`/changelog`) written from `content/changelog/*.md`. The homepage gallery shows the Quote and Weather cards with real data saved on Oct 15, 2026. The sidebar lists only built pages, and `/roadmap` lists the cards planned next.

## Tech stack

- **Framework:** Next.js 16 (App Router) with Cache Components and partial prefetching on, React 19, TypeScript, Turbopack, pnpm 10.
- **Design layer:** [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) (MIT, shadcn registry, Base UI flavor, spring motion), registered in `components.json` as `@fluid`. Cards stay on plain shadcn so anyone can install them; the chat block pulls in Fluid's chat message, message input and thinking indicator.
- **Components:** shadcn/ui (`base-nova` style), Base UI, Tailwind CSS v4, Motion, next-themes (light/dark, `D` toggles), Untitled UI and Lucide icons.
- **Registry:** `registry.json` (items: `chat`, `quote`, `weather`) + `shadcn build` into `public/r/`, so people install with `npx shadcn add`. `pnpm build` runs the registry build before `next build`.
- **Generative UI:** [json-render](https://github.com/vercel-labs/json-render) (`@json-render/core`, `react`, `devtools-react`, pinned at 0.21.1). Each card exports a catalog entry. The model replies with a short sentence plus a json-render spec built from the catalog, and `pipeJsonRender` splits the two in `app/api/chat`.
- **AI wiring:** Vercel AI SDK v7 (`ai`, `@ai-sdk/react`) through Vercel AI Gateway (`AI_GATEWAY_API_KEY`; the model defaults to `anthropic/claude-haiku-5.5`, override with `AI_GATEWAY_MODEL`). Zod 4 for schemas. assistant-ui and MCP/ChatGPT Apps adapters come later.
- **Data:** each card has a server-only query module and its own API route (`/api/quote` reads Yahoo Finance's public chart endpoint with a one-minute CDN cache, and `/api/weather` reads Open-Meteo with a ten-minute one, both without a key), plus a fake-data module for demos and tests.
- **Charts:** the quote card draws its trend line as plain SVG. Recharts and TradingView Lightweight Charts are installed for later cards (candlesticks, compare, smart chart).
- **Playground:** recorded chats, not live calls. `pnpm record <name> "<prompt>"` saves one real model reply, chunk by chunk with timing, to `content/recordings/` along with the data each card loaded, and the docs replay both, so readers never trigger a model call or a quote or weather request. `pnpm record:data` refreshes the saved card data without a model call.
- **Docs content:** Shiki for code highlighting, `mdast-util-from-markdown` for parsing the changelog.
- **Code quality:** [Ultracite](https://www.ultracite.ai) 8, a zero-config preset on ESLint + Prettier + Stylelint (with the Tailwind Prettier plugin). `pnpm check` lints, `pnpm fix` formats and auto-fixes; run `pnpm fix` before committing. The code standards live in `AGENTS.md`.
- **Agent skills:** tracked in `skills-lock.json`: fluid-functionalism, ultracite, nextjs-app-architecture, vercel-react-view-transitions, tech-writing.
- **Hosting:** Vercel. **Testing:** Vitest (installed, no tests yet), plus the playground for card states.

## Project layout

- `features/<card>/`: one folder per card with its components, catalog entry, schema, queries and fake data. This is what the registry ships.
- `features/chat/`: the chat, the card group and json-render devtools.
- `features/home/`: the homepage gallery and its saved card data in `features/home/snapshot/`.
- `app/api/chat`, `app/api/<card>`: the chat endpoint and each card's data route.
- `app/(docs)/`: the docs, changelog and roadmap routes, under one layout with a reading column and right rail. `components/docs/` and `lib/docs/` hold the playground and its replay transport.
- `content/changelog/`, `content/recordings/`: changelog entries and recorded chats.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | `shadcn build`, then `next build` |
| `pnpm registry:build` | Rebuild `public/r/` from `registry.json` |
| `pnpm check` / `pnpm fix` | Ultracite lint / format and auto-fix |
| `pnpm record <name> "<prompt>"` | Record a playground chat and its card data (needs `pnpm dev` and a Gateway key in `.env.local`) |
| `pnpm record:data [name...]` | Refresh the saved card data in recordings, no model call (needs `pnpm dev`) |

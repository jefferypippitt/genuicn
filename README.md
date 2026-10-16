# genuicn

genuicn is a shadcn registry of generative UI cards that render inside a chatbot. The chat uses [json-render](https://github.com/vercel-labs/json-render), so the model writes a small spec that names a card and its props, and the card fetches its own live data. Quote, a live stock quote card, is the first one. The other cards in the docs sidebar are planned.

To add the chat and cards to your own Next.js app, follow the Installation page at `/docs/installation`.

## Running this site

This repo is the docs site and the registry source. We use pnpm.

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). The docs playgrounds replay recorded chats along with the data each card loaded, so browsing the site calls neither the model nor the quote and weather services.

To try `/api/chat` locally, copy `.env.example` to `.env.local` and add an `AI_GATEWAY_API_KEY` from the Vercel dashboard under AI Gateway, API Keys.

## Scripts

- `pnpm registry:build` runs `shadcn build`, which writes the installable items in `registry.json` to `public/r/`. `pnpm build` runs it before `next build`.
- `pnpm record <name> "<prompt>"` sends one prompt to the running dev server and saves the reply to `content/recordings/<name>.json` for a docs playground, together with the data each card in the reply loaded. It needs `pnpm dev` running and the key in `.env.local`.
- `pnpm record:data [name...]` refreshes the card data in every recording, or in the ones named, without calling the model. It needs `pnpm dev` running. Run it before a deploy to bring the playground numbers up to date.
- `pnpm check` and `pnpm fix` run Ultracite.

The changelog lives in `content/changelog/`, one file per month. The format is in `content/changelog/README.md`.

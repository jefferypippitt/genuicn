import type { CardLookup } from "@/features/chat/lookup";

// What the reply's thinking steps say about each card: where its data comes
// from, and what it read once the data arrived. The steps start (or reuse)
// the card's own request, so they track the real fetch and never add one.
// Each genuicn card you install adds one line here, next to its lines in chat-catalog.ts and chat-registry.tsx. For example, the quote card:
//
//   import { quoteLookup } from "@/features/quote/quote-steps";
//   QuoteCard: quoteLookup,
export const lookups: Record<string, CardLookup> = {};

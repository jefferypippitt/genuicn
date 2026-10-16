"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";

// How each catalog component renders in the chat. Each genuicn card you install adds one line here, next to CardGroup. For example, the quote card:
//
//   import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";
//   QuoteCard: ({ props, loading }) => (
//     <LiveQuoteCard ticker={props.ticker} range={props.range ?? "1d"} streaming={loading} />
//   ),
export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
  },
});

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";

// Everything the model may put in a chat reply. The server turns this into
// the model's instructions (catalog.prompt); the client renders it through
// features/chat/chat-registry.tsx. CardGroup is the chat's own, for replies
// with several cards. Each genuicn card you install adds one line here and
// one there, next to it. For example, the quote card:
//
//   import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
//   QuoteCard: quoteCatalogEntry,
export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry,
  },
});

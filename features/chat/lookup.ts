/**
Where a card's data comes from: a source badge that links there.
*/
export interface Source {
  /**
  What the badge says, e.g. "finance.yahoo.com/quote/NVDA".
  */
  label: string;
  href: string;
}

export interface CardLookup {
  /**
  What the question asked for, given the cards' subjects: the description under "Understanding the question", e.g. "A stock quote for NVDA" or "The weather in London and Paris".
  */
  intent: (subjects: readonly string[]) => string;
  /**
  What one card is about, e.g. "London" or "NVDA"; null while the props aren't usable yet.
  */
  subject: (properties: Record<string, unknown>) => string | null;
  /** The card's own request for these props (shared, so the card reuses it
   *  when it mounts instead of fetching again). */
  load: (properties: Record<string, unknown>) => Promise<unknown>;
  /** Where this card's data comes from, shown as linked source badges.
   *  Badges with the same link appear once per reply. */
  sources: (properties: Record<string, unknown>) => readonly Source[];
}

/**
"London", "London and Paris", "London, Paris and Tokyo".
*/
export function listOf(items: readonly string[]) {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

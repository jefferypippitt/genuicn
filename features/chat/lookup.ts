/**
Where a card's data comes from, for the "Read N sources" step.
*/
export interface Source {
  /**
  Host or short name, e.g. "finance.yahoo.com".
  */
  label: string;
  href: string;
}

export interface CardLookup {
  /**
  What the question asked for, given the cards' subjects — e.g. "A stock quote for NVDA".
  */
  intent: (subjects: readonly string[]) => string;
  /**
  What one card is about, e.g. "London" or "NVDA"; null while the props aren't usable yet.
  */
  subject: (properties: Record<string, unknown>) => string | null;
  /** The card's own request for these props (shared, so the card reuses it
   *  when it mounts instead of fetching again). */
  load: (properties: Record<string, unknown>) => Promise<unknown>;
  /**
  Known source(s) for this card (Yahoo, ESPN, …). Used in "Read N sources"
  when the load doesn't discover a more specific page.
  */
  sources: (properties: Record<string, unknown>) => readonly Source[];
  /**
  Sources discovered only after the card's request lands (e.g. Parallel's
  extracted page). Wins over `sources` when present.
  */
  resultSources?: (result: unknown) => readonly Source[];
}

/**
"London", "London and Paris", "London, Paris and Tokyo".
*/
export function listOf(items: readonly string[]) {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

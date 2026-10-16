const QUOTE_RANGES = ["1d", "1w", "1m", "1y"];

const CARD_URLS = {
  QuoteCard: ({ ticker }) =>
    typeof ticker === "string" && ticker
      ? QUOTE_RANGES.map(
          (range) =>
            `/api/quote?ticker=${encodeURIComponent(ticker)}&range=${range}`
        )
      : [],
  WeatherCard: ({ location, units }) => {
    if (!(typeof location === "string" && location)) {
      return [];
    }
    const parameters = new URLSearchParams({ location });
    if (units) {
      parameters.set("units", units);
    }
    return [`/api/weather?${parameters}`];
  },
};

function cardUrls(recording) {
  const elements = new Map();
  for (const { chunks } of recording.turns) {
    for (const { chunk } of chunks) {
      const patch = chunk.type === "data-spec" ? chunk.data?.patch : null;
      if (patch?.value?.type in CARD_URLS) {
        elements.set(patch.path, patch.value);
      }
    }
  }
  return [...elements.values()].flatMap(({ type, props }) =>
    CARD_URLS[type](props ?? {})
  );
}

export async function fetchCardResponses(recording, origin) {
  const responses = {};
  for (const url of new Set(cardUrls(recording))) {
    // eslint-disable-next-line no-await-in-loop -- one request at a time is gentler on the upstream services
    const response = await fetch(`${origin}${url}`);
    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}.`);
    }
    responses[url] = await response.json();
  }
  return responses;
}

import { setTimeout } from "node:timers/promises";

const QUOTE_RANGES = ["1d", "1w", "1m", "1y"];
const CRYPTO_RANGES = ["24h", "1w", "1m", "1y", "all"];
const AREA_CHART_RANGES = ["10y", "25y", "50y", "max"];
const MAX_COMPARE = 6;
const MIN_COMPARE = 2;

function compareSubjects(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const subjects = [
    ...new Set(
      value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].filter((_, index) => index < MAX_COMPARE);
  return subjects.length >= MIN_COMPARE ? subjects : [];
}
const BUSY = 503;
const BUSY_WAIT_SECONDS = 20;
const BUSY_RETRIES = 3;
const BUSY_WAITS_SECONDS = Array.from(
  { length: BUSY_RETRIES },
  () => BUSY_WAIT_SECONDS
);
const MS_PER_SECOND = 1000;

function areaChartSubject({ topic, place }) {
  if (typeof topic === "string" && topic) {
    return topic;
  }
  return typeof place === "string" && place ? place : "";
}

// Keys are the catalog's component names, so they stay PascalCase.
/* eslint-disable sonarjs/function-name */
const CARD_URLS = {
  AreaChartCard: ({ topic, place, compare }) => {
    const subject = areaChartSubject({ place, topic });
    if (!subject) {
      return [];
    }
    const subjects = compareSubjects(compare);
    if (subjects.length >= MIN_COMPARE) {
      const parameters = new URLSearchParams({ range: "max", topic: subject });
      for (const name of subjects) {
        parameters.append("compare", name);
      }
      return [`/api/area-chart?${parameters}`];
    }
    return AREA_CHART_RANGES.map(
      (range) =>
        `/api/area-chart?topic=${encodeURIComponent(subject)}&range=${range}`
    );
  },
  BoardingPass: ({ flight, date }) => {
    if (!(typeof flight === "string" && flight)) {
      return [];
    }
    const parameters = new URLSearchParams({ flight });
    if (date) {
      parameters.set("date", date);
    }
    return [`/api/flights?${parameters}`];
  },
  CryptoCard: ({ symbol }) =>
    typeof symbol === "string" && symbol
      ? CRYPTO_RANGES.map(
          (range) =>
            `/api/crypto?symbol=${encodeURIComponent(symbol)}&range=${range}`
        )
      : [],
  NbaCupCard: ({ group }) =>
    typeof group === "string" && group
      ? [`/api/nba-cup?group=${encodeURIComponent(group)}`]
      : [],
  PlayerCard: ({ players }) =>
    Array.isArray(players)
      ? players
          .filter((player) => typeof player === "string" && player)
          .map((player) => `/api/player?${new URLSearchParams({ player })}`)
      : [],
  QuoteCard: ({ ticker }) =>
    typeof ticker === "string" && ticker
      ? QUOTE_RANGES.map(
          (range) =>
            `/api/quote?ticker=${encodeURIComponent(ticker)}&range=${range}`
        )
      : [],
  ScoreboardCard: ({ team, date }) => {
    if (!(typeof team === "string" && team)) {
      return [];
    }
    const parameters = new URLSearchParams({ team });
    if (date) {
      parameters.set("date", date);
    }
    return [`/api/scoreboard?${parameters}`];
  },
  StandingsCard: ({ conference }) =>
    conference === "east" || conference === "west"
      ? [`/api/standings?conference=${conference}`]
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
  WinProbabilityCard: ({ team, date }) => {
    if (!(typeof team === "string" && team)) {
      return [];
    }
    const parameters = new URLSearchParams({ team });
    if (date) {
      parameters.set("date", date);
    }
    return [`/api/win-probability?${parameters}`];
  },
};
/* eslint-enable sonarjs/function-name */

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

/**
Waits out a busy upstream (a 503, like CoinGecko rate-limiting) a few times before giving up.
*/
async function fetchPatiently(url) {
  let response = await fetch(url);
  for (const seconds of BUSY_WAITS_SECONDS) {
    if (response.status !== BUSY) {
      break;
    }
    console.log(`${url} is busy, waiting ${seconds}s…`);
    // eslint-disable-next-line no-await-in-loop -- each retry waits for the one before it
    await setTimeout(seconds * MS_PER_SECOND);
    // eslint-disable-next-line no-await-in-loop -- each retry waits for the one before it
    response = await fetch(url);
  }
  return response;
}

export async function fetchCardResponses(recording, origin) {
  const responses = {};
  for (const url of new Set(cardUrls(recording))) {
    // eslint-disable-next-line no-await-in-loop -- one request at a time is gentler on the upstream services
    const response = await fetchPatiently(`${origin}${url}`);
    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}.`);
    }
    responses[url] = await response.json();
  }
  return responses;
}

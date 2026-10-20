import { buildSpecFromParts } from "@json-render/react";
import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
} from "ai";

/**
Everyday questions and the card a person asking each one wants. People rarely name a card ("candlestick"), so these are worded the way people ask, and the model has to route on what the question is about. `card` lists every acceptable answer: a card name, or "text" for a plain reply. `range`, when set, is the range the card should open on.
*/
const CASES = [
  // Where a stock stands: the Quote card.
  { card: ["QuoteCard"], prompt: "How's NVDA doing?" },
  { card: ["QuoteCard"], prompt: "What's Apple trading at?" },
  { card: ["QuoteCard"], prompt: "Is Tesla up today?", range: "1d" },
  { card: ["QuoteCard"], prompt: "price of microsoft" },
  { card: ["QuoteCard"], prompt: "How are NVDA, AMD and Intel doing?" },
  {
    card: ["QuoteCard"],
    prompt: "How has Amazon done this year?",
    range: "1y",
  },
  { card: ["QuoteCard"], prompt: "check on my google shares" },
  {
    card: ["QuoteCard"],
    prompt: "Did Netflix go up or down this week?",
    range: "1w",
  },
  { card: ["QuoteCard"], prompt: "how much is one share of costco" },
  { card: ["QuoteCard"], prompt: "how's my AAPL position looking" },

  // How a stock moved: the Candlestick card.
  {
    card: ["CandlestickCard"],
    prompt: "How did Tesla trade today?",
    range: "1d",
  },
  {
    card: ["CandlestickCard"],
    prompt: "What happened to NVDA this week?",
    range: "1w",
  },
  {
    card: ["CandlestickCard"],
    prompt: "How volatile has Coinbase been this month?",
    range: "1m",
  },
  {
    card: ["CandlestickCard"],
    prompt: "What was AMD's high and low this week?",
    range: "1w",
  },
  {
    card: ["CandlestickCard"],
    prompt: "Was Palantir's volume heavy today?",
    range: "1d",
  },
  { card: ["CandlestickCard"], prompt: "Is NVDA near support?" },
  { card: ["CandlestickCard"], prompt: "Show me the chart for SPY" },
  {
    card: ["CandlestickCard"],
    prompt: "Did Meta gap up this morning?",
    range: "1d",
  },
  { card: ["CandlestickCard"], prompt: "Is now a good entry on Netflix?" },
  {
    card: ["CandlestickCard"],
    prompt: "how choppy was tesla last week",
    range: "1w",
  },
  {
    card: ["CandlestickCard"],
    prompt: "walk me through apple's price action this month",
    range: "1m",
  },
  {
    card: ["CandlestickCard"],
    prompt: "what's going on with intel stock this week",
    range: "1w",
  },
  {
    card: ["CandlestickCard"],
    prompt: "where did AMD bounce this month",
    range: "1m",
  },
  {
    card: ["CandlestickCard"],
    prompt: "was nvidia all over the place today",
    range: "1d",
  },

  // Either reading is fair.
  {
    card: ["CandlestickCard", "text"],
    prompt: "Why did Apple drop on Friday?",
  },
  {
    card: ["CandlestickCard", "QuoteCard"],
    prompt: "is disney worth buying at this level",
  },
];

const origin = process.env.CHAT_ORIGIN ?? "http://localhost:3000";
const PARALLEL_REQUESTS = 6;
const PROMPT_WIDTH = 52;
const CARD_WIDTH = 16;
/**
Where the card names start in process.argv, after node and the script.
*/
const FIRST_ARGUMENT = 2;
const EMPTY = 0;
const EXIT_FAILURE = 1;

/**
Only the cases for the cards named on the command line, or every case.
*/
function selectedCases() {
  const cards = process.argv.slice(FIRST_ARGUMENT);
  return cards.length === EMPTY
    ? CASES
    : CASES.filter((item) => item.card.some((card) => cards.includes(card)));
}

async function postQuestion(prompt) {
  try {
    return await fetch(`${origin}/api/chat`, {
      body: JSON.stringify({
        messages: [
          {
            id: "route-check",
            parts: [{ text: prompt, type: "text" }],
            role: "user",
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    return null;
  }
}

/**
Posts one question to the chat and reads the reply the way the chat UI does: the AI SDK parses the event stream into UI message chunks and builds the message, and json-render builds the card spec from its parts.
*/
async function ask(prompt) {
  const response = await postQuestion(prompt);
  if (!(response?.ok && response.body)) {
    throw new Error(
      `Couldn't reach ${origin}/api/chat (${response?.status ?? "no response"}). Is pnpm dev running?`
    );
  }

  const chunks = parseJsonEventStream({
    schema: uiMessageChunkSchema,
    stream: response.body,
  }).pipeThrough(
    new TransformStream({
      transform(result, controller) {
        if (!result.success) {
          throw result.error;
        }
        controller.enqueue(result.value);
      },
    })
  );

  const updates = readUIMessageStream({ stream: chunks });
  let message;
  for await (const update of updates) {
    message = update;
  }
  const spec = buildSpecFromParts(message?.parts ?? []);
  return Object.values(spec?.elements ?? {}).filter(
    (element) => element.type !== "CardGroup"
  );
}

/**
What the reply showed: one card name, several joined by "+", or "text".
*/
function shownAs(elements) {
  const names = [...new Set(elements.map((element) => element.type))];
  return names.length === EMPTY ? "text" : names.join("+");
}

async function check(item) {
  const elements = await ask(item.prompt);
  const got = shownAs(elements);
  const ranges = [
    ...new Set(elements.map((element) => element.props?.range ?? null)),
  ];
  const isRightRange =
    item.range === undefined ||
    (ranges.length > EMPTY && ranges.every((range) => range === item.range));
  return {
    ...item,
    got,
    isPass: item.card.includes(got) && isRightRange,
    isRightRange,
    ranges,
  };
}

/**
Checks every case, a few requests at a time: each worker takes the next case until none are left. Results keep the cases' order.
*/
async function checkAll(cases) {
  // One iterator shared by every worker, so each case is taken once.
  const pending = cases.entries();
  const work = async (done) => {
    const next = pending.next();
    if (next.done) {
      return done;
    }
    const [index, item] = next.value;
    const result = { index, ...(await check(item)) };
    return work([...done, result]);
  };
  const workers = Array.from({ length: PARALLEL_REQUESTS }, () => work([]));
  const finished = await Promise.all(workers);
  const results = finished.flat();
  return results.toSorted((first, second) => first.index - second.index);
}

function report(result) {
  const range = result.isRightRange
    ? ""
    : `  range ${result.ranges.join("+") || "none"}, want ${result.range}`;
  console.log(
    `${result.isPass ? "PASS" : "MISS"}  ${result.prompt.padEnd(PROMPT_WIDTH)} want ${result.card.join("|").padEnd(CARD_WIDTH)} got ${result.got}${range}`
  );
}

async function main() {
  const cases = selectedCases();
  if (cases.length === EMPTY) {
    console.error(
      "Usage: pnpm route:check [CardName...]  (no case wants those cards)"
    );
    process.exitCode = EXIT_FAILURE;
    return;
  }
  const results = await checkAll(cases);
  for (const result of results) {
    report(result);
  }
  const passed = results.filter((result) => result.isPass).length;
  console.log(`
${passed}/${results.length} routed as expected`);
  if (passed < results.length) {
    process.exitCode = EXIT_FAILURE;
  }
}

await main();

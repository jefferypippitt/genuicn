import "server-only";
import {
  createExtractTool,
  createSearchTool,
} from "@parallel-web/ai-sdk-tools";
import { generateText, isStepCount, Output } from "ai";
import { barChartResultSchema } from "@/features/bar-chart/bar-chart-schema";
import type {
  BarChartBar,
  BarChartData,
  BarChartResult,
} from "@/features/bar-chart/bar-chart-schema";

/**
Research copies data tables into numbers, so it uses the same model as the area chart's research, separate from the chat model.
*/
const DEFAULT_RESEARCH_MODEL = "anthropic/claude-haiku-5.5";

/**
Tool steps before the model must answer. Step 0 is forced to search and step 1 to extract, so the numbers come from a page rather than memory; without a forced final answer the model keeps digging and returns nothing.
*/
const STEPS = 5;
const TIMEOUT_MS = 55_000;
/**
Parallel serves cached pages by default; an extracted page older than a day is fetched live so a table's newest release isn't missed.
*/
const LIVE_FETCH_MAX_AGE_S = 86_400;

export class BarChartNotFoundError extends Error {
  constructor(topic: string, options?: ErrorOptions) {
    super(`No bar chart figures found for "${topic}".`, options);
    this.name = "BarChartNotFoundError";
  }
}

function researchPrompt(topic: string, limit: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();

  return `Today is ${today.toISOString().slice(0, 10)}. Find real public figures that answer this as a bar chart, one bar per category:

Topic: ${topic}

Requirements:
- Prefer official or well-known statistical sources (World Bank, IMF, OECD, Our World in Data, UN, US Census, US EIA, national stats offices, league or company filings).
- Search first, then extract the best URL(s) — a data table, CSV or JSON API, not an article — and copy the numbers from it.
- Every bar is the same measure for the same period, from one source. Use the latest period that source covers for all categories; it should be ${year - 1} or ${year} for anything still published.
- Up to ${limit} bars. When the topic ranks many categories (countries, states, companies), keep the ${limit} biggest. When it splits one whole into a few parts, keep every part, folding the smallest into "Other" if there are more than ${limit}.
- Leave out totals and aggregates (World, Total, EU) unless the topic asks for them.
- Numeric values only (no units inside the number), in one unit across all bars, written out in full: when a table is in thousands or millions, multiply it out (US$ 30,769,700 million is 30769700000000) and leave "millions" or "thousand" out of the label.
- scale: "percent" for rates/shares, "currency" for money in USD, otherwise "number".
- You have ${STEPS} tool steps, then you must answer from what you extracted.
- If the topic cannot be turned into numbers per category, fail rather than inventing them.`;
}

function cleanBars(
  bars: readonly BarChartBar[],
  limit: number,
  isOrdered: boolean
): BarChartBar[] {
  const byName = new Map<string, number>();
  for (const { name, value } of bars) {
    const trimmed = name.trim();
    if (trimmed && Number.isFinite(value) && !byName.has(trimmed)) {
      byName.set(trimmed, value);
    }
  }
  const cleaned = [...byName].map(([name, value]) => ({ name, value }));
  const sorted = isOrdered
    ? cleaned
    : cleaned.toSorted((left, right) => right.value - left.value);
  return sorted.slice(0, limit);
}

function toBarChartData(
  query: string,
  limit: number,
  output: BarChartResult
): BarChartData {
  const bars = cleanBars(output.bars, limit, output.ordered);
  if (bars.length < 2) {
    throw new BarChartNotFoundError(query);
  }
  return {
    asOf: Date.now(),
    bars,
    fake: false,
    isPartsOfWhole: output.partsOfWhole,
    label: output.label.trim() || "Value",
    period: output.period.trim(),
    scale: output.scale,
    sourceHref: output.sourceHref ?? undefined,
    sourceLabel: output.sourceLabel ?? undefined,
    topic: query,
  };
}

async function researchOnce(
  query: string,
  limit: number,
  abortSignal: AbortSignal
): Promise<BarChartData> {
  const model = process.env.BAR_CHART_MODEL || DEFAULT_RESEARCH_MODEL;
  const webSearch = createSearchTool({
    client_model: model,
    max_results: 8,
    mode: "advanced",
  });
  const webExtract = createExtractTool({
    client_model: model,
    fetch_policy: { max_age_seconds: LIVE_FETCH_MAX_AGE_S },
  });

  const { output } = await generateText({
    abortSignal,
    instructions:
      "You turn questions into honest per-category figures for a generative UI bar chart. Never invent, estimate or recall figures from memory: every value must come from a page you extracted.",
    model,
    output: Output.object({ schema: barChartResultSchema }),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: { toolName: "webSearch", type: "tool" } };
      }
      if (stepNumber === 1) {
        return { toolChoice: { toolName: "webExtract", type: "tool" } };
      }
      return stepNumber >= STEPS ? { toolChoice: "none" } : {};
    },
    prompt: researchPrompt(query, limit),
    stopWhen: isStepCount(STEPS + 1),
    tools: {
      webExtract,
      webSearch,
    },
  });

  if (!output?.bars?.length) {
    throw new BarChartNotFoundError(query);
  }
  return toBarChartData(query, limit, output);
}

async function researchBarChart(
  query: string,
  limit: number
): Promise<BarChartData> {
  const abortSignal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    return await researchOnce(query, limit, abortSignal);
  } catch (error) {
    if (abortSignal.aborted) {
      throw error;
    }
    return await researchOnce(query, limit, abortSignal);
  }
}

/**
Research a free-text topic on the web (Parallel search + extract) and shape it into one bar per category.
*/
export async function getBarChart(
  topic: string,
  limit: number
): Promise<BarChartData> {
  const query = topic.trim();
  if (!query) {
    throw new BarChartNotFoundError(topic);
  }
  if (!process.env.PARALLEL_API_KEY) {
    throw new Error(
      "PARALLEL_API_KEY is missing. Add it to .env.local to load live bar charts."
    );
  }

  try {
    return await researchBarChart(query, limit);
  } catch (error) {
    if (error instanceof BarChartNotFoundError) {
      throw error;
    }
    if (Error.isError(error) && /PARALLEL_API_KEY/u.test(error.message)) {
      throw error;
    }
    throw new BarChartNotFoundError(query, { cause: error });
  }
}

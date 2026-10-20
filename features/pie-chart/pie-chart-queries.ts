import "server-only";
import {
  createExtractTool,
  createSearchTool,
} from "@parallel-web/ai-sdk-tools";
import { generateText, isStepCount, Output } from "ai";
import {
  MIN_SLICES,
  foldSlices,
  pieChartResultSchema,
} from "@/features/pie-chart/pie-chart-schema";
import type {
  PieChartData,
  PieChartResult,
  PieSlice,
} from "@/features/pie-chart/pie-chart-schema";

/**
Research copies data tables into numbers, so it uses the same model as the other charts' research, separate from the chat model.
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

export class PieChartNotFoundError extends Error {
  constructor(topic: string, options?: ErrorOptions) {
    super(`No pie chart figures found for "${topic}".`, options);
    this.name = "PieChartNotFoundError";
  }
}

function researchPrompt(topic: string): string {
  const today = new Date();
  const year = today.getUTCFullYear();

  return `Today is ${today.toISOString().slice(0, 10)}. Find a real public breakdown of one whole into its parts, for a pie chart:

Topic: ${topic}

Requirements:
- One whole split into parts that add up to it: electricity generation by source, market share by company, a budget by category, population by age group.
- Prefer official or well-known sources (national statistics offices, US EIA, IEA, Ember, IDC, Statista summaries, government budgets, company filings).
- Search first, then extract the best URL(s) — a data table, CSV or JSON API, or a report's table — and copy the numbers from it.
- The latest full period, ${year - 1} or ${year} when it's published. Say which period in period.
- List every part the source lists, each in the same unit; keep the source's own "Other" if it has one. The card folds the smallest parts together itself.
- Positive numeric values only, written out in full: when a table is in thousands or millions, multiply it out and leave "millions" out of the label.
- scale: "percent" when the values are shares adding up to about 100, "currency" for money in USD, otherwise "number".
- You have ${STEPS} tool steps, then you must answer from what you extracted.
- If the topic isn't a whole made of parts, fail rather than inventing one.`;
}

function cleanSlices(slices: PieChartResult["slices"]): PieSlice[] {
  const seen = new Set<string>();
  const cleaned: PieSlice[] = [];
  for (const slice of slices) {
    const label = slice.label.trim();
    if (
      !label ||
      !Number.isFinite(slice.value) ||
      slice.value <= 0 ||
      seen.has(label.toLowerCase())
    ) {
      continue;
    }
    seen.add(label.toLowerCase());
    cleaned.push({ label, value: slice.value });
  }
  return foldSlices(cleaned);
}

function toPieChartData(query: string, output: PieChartResult): PieChartData {
  const slices = cleanSlices(output.slices);
  if (slices.length < MIN_SLICES) {
    throw new PieChartNotFoundError(query);
  }
  return {
    asOf: Date.now(),
    fake: false,
    label: output.label.trim() || "Share",
    period: output.period?.trim() || null,
    scale: output.scale,
    slices,
    sourceHref: output.sourceHref ?? undefined,
    sourceLabel: output.sourceLabel ?? undefined,
    topic: query,
  };
}

async function researchOnce(
  query: string,
  abortSignal: AbortSignal
): Promise<PieChartData> {
  const model = process.env.PIE_CHART_MODEL || DEFAULT_RESEARCH_MODEL;
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
      "You turn questions into honest breakdowns of a whole into its parts for a generative UI pie chart. Never invent, estimate or recall figures from memory: every value must come from a page you extracted.",
    model,
    output: Output.object({ schema: pieChartResultSchema }),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: { toolName: "webSearch", type: "tool" } };
      }
      if (stepNumber === 1) {
        return { toolChoice: { toolName: "webExtract", type: "tool" } };
      }
      return stepNumber >= STEPS ? { toolChoice: "none" } : {};
    },
    prompt: researchPrompt(query),
    stopWhen: isStepCount(STEPS + 1),
    tools: {
      webExtract,
      webSearch,
    },
  });

  if (!output?.slices?.length) {
    throw new PieChartNotFoundError(query);
  }
  return toPieChartData(query, output);
}

async function researchPieChart(query: string): Promise<PieChartData> {
  const abortSignal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    return await researchOnce(query, abortSignal);
  } catch (error) {
    if (abortSignal.aborted) {
      throw error;
    }
    return await researchOnce(query, abortSignal);
  }
}

/**
Research a free-text topic on the web (Parallel search + extract) and shape it into the parts of one whole.
*/
export async function getPieChart(topic: string): Promise<PieChartData> {
  const query = topic.trim();
  if (!query) {
    throw new PieChartNotFoundError(topic);
  }
  if (!process.env.PARALLEL_API_KEY) {
    throw new Error(
      "PARALLEL_API_KEY is missing. Add it to .env.local to load live pie charts."
    );
  }

  try {
    return await researchPieChart(query);
  } catch (error) {
    if (error instanceof PieChartNotFoundError) {
      throw error;
    }
    if (Error.isError(error) && /PARALLEL_API_KEY/u.test(error.message)) {
      throw error;
    }
    throw new PieChartNotFoundError(query, { cause: error });
  }
}

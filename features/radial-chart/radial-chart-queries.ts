import "server-only";
import {
  createExtractTool,
  createSearchTool,
} from "@parallel-web/ai-sdk-tools";
import { generateText, isStepCount, Output } from "ai";
import {
  MAX_RINGS,
  MIN_RINGS,
  radialChartResultSchema,
} from "@/features/radial-chart/radial-chart-schema";
import type {
  RadialChartData,
  RadialChartResult,
  RadialRing,
} from "@/features/radial-chart/radial-chart-schema";

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

export class RadialChartNotFoundError extends Error {
  constructor(topic: string, options?: ErrorOptions) {
    super(`No radial chart figures found for "${topic}".`, options);
    this.name = "RadialChartNotFoundError";
  }
}

function researchPrompt(topic: string): string {
  const today = new Date();
  const year = today.getUTCFullYear();

  return `Today is ${today.toISOString().slice(0, 10)}. Find real public figures for a few items measured against the same full mark, for a radial chart (one ring per item, a full ring being the mark):

Topic: ${topic}

Requirements:
- ${MIN_RINGS}–${MAX_RINGS} items in one unit, each a level against a natural full mark: reservoirs as percent of capacity, renewable share of electricity by country, adoption rates, progress toward a target.
- max: the value of a full ring — 100 for shares and percent of capacity, the target when there is one, otherwise null.
- Prefer official or well-known sources (state water agencies, Ember, IEA, Pew Research, national statistics offices).
- Search first, then extract the best URL(s) — a data table, CSV or JSON API, not an article — and copy the numbers from it.
- The latest figures, ${year - 1} or ${year} (or today's reading for live levels). Say which period in period.
- When the topic doesn't name the items, pick the ${MAX_RINGS} a reader would check first (the largest reservoirs, the biggest economies).
- Non-negative numeric values only, written out in full.
- scale: "percent" for rates and shares, "currency" for money in USD, otherwise "number".
- You have ${STEPS} tool steps, then you must answer from what you extracted.
- If the topic can't be measured this way, fail rather than inventing figures.`;
}

function cleanRings(rings: RadialChartResult["rings"]): RadialRing[] {
  const seen = new Set<string>();
  const cleaned: RadialRing[] = [];
  for (const ring of rings) {
    const name = ring.name.trim();
    if (
      !name ||
      !Number.isFinite(ring.value) ||
      ring.value < 0 ||
      seen.has(name.toLowerCase())
    ) {
      continue;
    }
    seen.add(name.toLowerCase());
    cleaned.push({ name, value: ring.value });
  }
  return cleaned.toSorted((a, b) => b.value - a.value).slice(0, MAX_RINGS);
}

function toRadialChartData(
  query: string,
  output: RadialChartResult
): RadialChartData {
  const rings = cleanRings(output.rings);
  if (rings.length < MIN_RINGS) {
    throw new RadialChartNotFoundError(query);
  }
  return {
    asOf: Date.now(),
    fake: false,
    label: output.label.trim() || "Value",
    max: output.max && output.max > 0 ? output.max : null,
    period: output.period?.trim() || null,
    rings,
    scale: output.scale,
    sourceHref: output.sourceHref ?? undefined,
    sourceLabel: output.sourceLabel ?? undefined,
    topic: query,
  };
}

async function researchOnce(
  query: string,
  abortSignal: AbortSignal
): Promise<RadialChartData> {
  const model = process.env.RADIAL_CHART_MODEL || DEFAULT_RESEARCH_MODEL;
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
      "You turn questions into honest progress figures, a few items each measured against the same full mark, for a generative UI radial chart. Never invent, estimate or recall figures from memory: every value must come from a page you extracted.",
    model,
    output: Output.object({ schema: radialChartResultSchema }),
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

  if (!output?.rings?.length) {
    throw new RadialChartNotFoundError(query);
  }
  return toRadialChartData(query, output);
}

async function researchRadialChart(query: string): Promise<RadialChartData> {
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
Research a free-text topic on the web (Parallel search + extract) and shape it into a few items measured against the same full mark.
*/
export async function getRadialChart(topic: string): Promise<RadialChartData> {
  const query = topic.trim();
  if (!query) {
    throw new RadialChartNotFoundError(topic);
  }
  if (!process.env.PARALLEL_API_KEY) {
    throw new Error(
      "PARALLEL_API_KEY is missing. Add it to .env.local to load live radial charts."
    );
  }

  try {
    return await researchRadialChart(query);
  } catch (error) {
    if (error instanceof RadialChartNotFoundError) {
      throw error;
    }
    if (Error.isError(error) && /PARALLEL_API_KEY/u.test(error.message)) {
      throw error;
    }
    throw new RadialChartNotFoundError(query, { cause: error });
  }
}

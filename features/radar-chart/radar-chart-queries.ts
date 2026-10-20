import "server-only";
import {
  createExtractTool,
  createSearchTool,
} from "@parallel-web/ai-sdk-tools";
import { generateText, isStepCount, Output } from "ai";
import {
  MAX_AXES,
  MAX_SERIES,
  MIN_AXES,
  radarChartResultSchema,
} from "@/features/radar-chart/radar-chart-schema";
import type {
  RadarChartData,
  RadarChartResult,
  RadarSeries,
} from "@/features/radar-chart/radar-chart-schema";

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

export class RadarChartNotFoundError extends Error {
  constructor(topic: string, options?: ErrorOptions) {
    super(`No radar chart figures found for "${topic}".`, options);
    this.name = "RadarChartNotFoundError";
  }
}

function researchPrompt(topic: string): string {
  const today = new Date();
  const year = today.getUTCFullYear();

  return `Today is ${today.toISOString().slice(0, 10)}. Find real public figures that profile one to ${MAX_SERIES} subjects on the same set of measures, for a radar chart:

Topic: ${topic}

Requirements:
- ${MIN_AXES}–${MAX_AXES} measures (the axes), the same ones for every subject, all on one shared scale so they can sit on one web: benchmark percentages, percent of daily value, ratings out of 100.
- Never mix units across axes (dollars on one, percent on another); pick measures that share a scale.
- Prefer official or well-known sources (USDA FoodData Central, DXOMARK, published benchmark tables, national statistics offices).
- Search first, then extract the best URL(s) — a data table, CSV or JSON API, not an article — and copy the numbers from it.
- The latest edition, ${year - 1} or ${year} when it's published.
- max: the top of the scale when it has one (10 for 0–10, 100 for percent scores), otherwise null.
- Numeric values only; null for a measure the source has no figure for.
- You have ${STEPS} tool steps, then you must answer from what you extracted.
- If the topic can't be scored on shared measures, fail rather than inventing them.`;
}

/**
Drops a note the research model tacks on a name, like "Apple (raw, with skin)": the shape's label only has room for the name.
*/
function withoutNote(name: string): string {
  const trimmed = name.trim();
  const open = trimmed.indexOf(" (");
  return open > 0 && trimmed.endsWith(")") ? trimmed.slice(0, open) : trimmed;
}

function cleanAxes(axes: readonly string[]): string[] {
  return axes
    .map((axis) => axis.trim())
    .filter(Boolean)
    .slice(0, MAX_AXES);
}

function cleanSeries(
  series: RadarChartResult["series"],
  axisCount: number
): RadarSeries[] {
  const seen = new Set<string>();
  const cleaned: RadarSeries[] = [];
  for (const entry of series) {
    const name = withoutNote(entry.name);
    const values = Array.from({ length: axisCount }, (_, index) => {
      const value = entry.values[index];
      return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : null;
    });
    if (
      !name ||
      seen.has(name.toLowerCase()) ||
      values.every((value) => value === null)
    ) {
      continue;
    }
    seen.add(name.toLowerCase());
    cleaned.push({ name, values });
  }
  return cleaned.slice(0, MAX_SERIES);
}

function toRadarChartData(
  query: string,
  output: RadarChartResult
): RadarChartData {
  const axes = cleanAxes(output.axes);
  const series = cleanSeries(output.series, axes.length);
  if (axes.length < MIN_AXES || series.length === 0) {
    throw new RadarChartNotFoundError(query);
  }
  return {
    asOf: Date.now(),
    axes,
    fake: false,
    label: output.label.trim() || "Score",
    max: output.max && output.max > 0 ? output.max : null,
    scale: output.scale,
    series,
    sourceHref: output.sourceHref ?? undefined,
    sourceLabel: output.sourceLabel ?? undefined,
    topic: query,
  };
}

async function researchOnce(
  query: string,
  abortSignal: AbortSignal
): Promise<RadarChartData> {
  const model = process.env.RADAR_CHART_MODEL || DEFAULT_RESEARCH_MODEL;
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
      "You turn questions into honest profiles, one or a few subjects scored on the same measures, for a generative UI radar chart. Never invent, estimate or recall figures from memory: every value must come from a page you extracted.",
    model,
    output: Output.object({ schema: radarChartResultSchema }),
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

  if (!output?.series?.length) {
    throw new RadarChartNotFoundError(query);
  }
  return toRadarChartData(query, output);
}

async function researchRadarChart(query: string): Promise<RadarChartData> {
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
Research a free-text topic on the web (Parallel search + extract) and shape it into a few subjects scored on the same measures.
*/
export async function getRadarChart(topic: string): Promise<RadarChartData> {
  const query = topic.trim();
  if (!query) {
    throw new RadarChartNotFoundError(topic);
  }
  if (!process.env.PARALLEL_API_KEY) {
    throw new Error(
      "PARALLEL_API_KEY is missing. Add it to .env.local to load live radar charts."
    );
  }

  try {
    return await researchRadarChart(query);
  } catch (error) {
    if (error instanceof RadarChartNotFoundError) {
      throw error;
    }
    if (Error.isError(error) && /PARALLEL_API_KEY/u.test(error.message)) {
      throw error;
    }
    throw new RadarChartNotFoundError(query, { cause: error });
  }
}

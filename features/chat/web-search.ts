import "server-only";
import { createSearchTool } from "@parallel-web/ai-sdk-tools";
import { tool } from "ai";
import { z } from "zod";
import { hostOf } from "@/lib/url-host";

const MAX_RESULTS = 6;
const MAX_EXCERPT_CHARS = 4000;

export interface WebSearchSource {
  readonly id: number;
  readonly title: string;
  readonly url: string;
  readonly published: string | null;
  readonly excerpts: readonly string[];
}

export interface WebSearchOutput {
  readonly results: readonly WebSearchSource[];
}

interface RawResult {
  readonly url: string;
  readonly title?: string | null;
  readonly excerpts?: readonly string[];
  readonly publish_date?: string | null;
}

function hasResults<RESULT>(value: unknown): value is { results: RESULT[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export function isWebSearchOutput(value: unknown): value is WebSearchOutput {
  return hasResults<WebSearchSource>(value);
}

export function createWebSearch(model: string) {
  const search = createSearchTool({
    client_model: model,
    max_results: MAX_RESULTS,
    mode: "basic",
  });
  let nextId = 1;

  return tool({
    description:
      "Search the web for facts no card covers: history, how-many and who/why questions, recent events. Returns numbered results; cite them as [n].",
    execute: async ({ objective, queries }, options) => {
      const response = await search.execute?.(
        { objective, search_queries: queries },
        options
      );
      if (!hasResults<RawResult>(response)) {
        throw new Error("The web search returned nothing.");
      }
      const firstId = nextId;
      nextId += response.results.length;
      const results = response.results.map(
        (result, index): WebSearchSource => ({
          excerpts: (result.excerpts ?? []).map((excerpt) =>
            excerpt.slice(0, MAX_EXCERPT_CHARS)
          ),
          id: firstId + index,
          published: result.publish_date ?? null,
          title: result.title?.trim() || hostOf(result.url),
          url: result.url,
        })
      );
      return { results } satisfies WebSearchOutput;
    },
    inputSchema: z.object({
      objective: z
        .string()
        .describe("What the answer needs, in one sentence, for ranking."),
      queries: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe("1–3 short keyword queries."),
    }),
  });
}

import { listOf } from "@/features/chat/lookup";
import { loadPieChart } from "@/features/pie-chart/pie-chart-requests";
import { hostOf } from "@/lib/url-host";
import type { CardLookup, Source } from "@/features/chat/lookup";

function topicOf(properties: Record<string, unknown>): string {
  return typeof properties.topic === "string" ? properties.topic.trim() : "";
}

function researchSources(result: unknown): readonly Source[] {
  if (!result || typeof result !== "object") {
    return [];
  }
  const { sourceHref, sourceLabel } = result as {
    sourceHref?: unknown;
    sourceLabel?: unknown;
  };
  if (typeof sourceHref !== "string" || !sourceHref) {
    return [];
  }
  const label =
    typeof sourceLabel === "string" && sourceLabel.trim()
      ? sourceLabel.trim()
      : hostOf(sourceHref);
  return [{ href: sourceHref, label }];
}

export const pieChartLookup: CardLookup = {
  intent: (topics) =>
    topics.length === 1
      ? `The breakdown of ${topics[0]}`
      : `The breakdowns of ${listOf(topics)}`,
  load: (properties) => {
    const topic = topicOf(properties);
    return topic
      ? loadPieChart(topic)
      : Promise.reject(
          new Error(
            'Pass a topic, for example "US electricity generation by source".'
          )
        );
  },
  resultSources: researchSources,
  sources: () => [
    {
      href: "https://parallel.ai",
      label: "parallel.ai",
    },
  ],
  subject: (properties) => topicOf(properties) || null,
};

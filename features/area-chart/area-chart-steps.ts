import { listOf } from "@/features/chat/lookup";
import { loadAreaChart } from "@/features/area-chart/area-chart-requests";
import {
  compareSubjects,
  isAreaChartRange,
  shouldShowAreaChartRanges,
} from "@/features/area-chart/area-chart-schema";
import { hostOf } from "@/lib/url-host";
import type { AreaChartRange } from "@/features/area-chart/area-chart-schema";
import type { CardLookup, Source } from "@/features/chat/lookup";

function topicFromProperties(properties: Record<string, unknown>): string {
  if (typeof properties.topic === "string") {
    return properties.topic;
  }
  return typeof properties.place === "string" ? properties.place : "";
}

function defaultRange(hasRanges: boolean): AreaChartRange {
  return hasRanges ? "50y" : "max";
}

function propertiesOf(properties: Record<string, unknown>) {
  const hasRanges = shouldShowAreaChartRanges(properties.ranges);
  return {
    compare: compareSubjects(properties.compare),
    hasRanges,
    range: isAreaChartRange(properties.range)
      ? properties.range
      : defaultRange(hasRanges),
    topic: topicFromProperties(properties),
  };
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

export const areaChartLookup: CardLookup = {
  intent: (topics) =>
    topics.length === 1
      ? `The trend of ${topics[0]}`
      : `Trends for ${listOf(topics)}`,
  load: (properties) => {
    const { compare, topic, range, hasRanges } = propertiesOf(properties);
    return topic
      ? loadAreaChart(topic, range, { compare, ranges: hasRanges })
      : Promise.reject(
          new Error(
            'Pass a topic, for example "US solar share of electricity".'
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
  subject: (properties) => {
    const topic = propertiesOf(properties).topic.trim();
    return topic || null;
  },
};

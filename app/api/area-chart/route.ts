import {
  AreaChartNotFoundError,
  getAreaChart,
} from "@/features/area-chart/area-chart-queries";
import {
  AREA_CHART_RANGES,
  compareSubjects,
} from "@/features/area-chart/area-chart-schema";
import type { AreaChartRange } from "@/features/area-chart/area-chart-schema";

// Compare subjects research in parallel for up to 85s (COMPARE_BUDGET).
export const maxDuration = 90;

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic =
    searchParams.get("topic")?.trim() ||
    searchParams.get("place")?.trim() ||
    "";
  const range = searchParams.get("range") ?? "max";

  if (!topic || !(AREA_CHART_RANGES as readonly string[]).includes(range)) {
    return Response.json(
      {
        error:
          "Pass a topic (any chartable question) and a range of 10y, 25y, 50y or max.",
      },
      { status: 400 }
    );
  }

  const compare = compareSubjects(searchParams.getAll("compare"));
  try {
    const data = await getAreaChart(topic, range as AreaChartRange, compare);
    return Response.json(data, {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof AreaChartNotFoundError ? 404 : 502;
    return Response.json(
      {
        error: Error.isError(error) ? error.message : "Area chart failed.",
      },
      { status }
    );
  }
}

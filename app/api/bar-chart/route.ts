import {
  BarChartNotFoundError,
  getBarChart,
} from "@/features/bar-chart/bar-chart-queries";
import { barLimit } from "@/features/bar-chart/bar-chart-schema";

// Research runs for up to 55s (TIMEOUT_MS).
export const maxDuration = 60;

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic")?.trim() ?? "";

  if (!topic) {
    return Response.json(
      { error: "Pass a topic, for example GDP by country." },
      { status: 400 }
    );
  }

  const requested = searchParams.get("limit");
  const limit = barLimit(requested ? Number(requested) : undefined);
  try {
    const data = await getBarChart(topic, limit);
    return Response.json(data, {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof BarChartNotFoundError ? 404 : 502;
    return Response.json(
      {
        error: Error.isError(error) ? error.message : "Bar chart failed.",
      },
      { status }
    );
  }
}

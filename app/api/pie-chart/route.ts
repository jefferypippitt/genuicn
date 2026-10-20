import {
  PieChartNotFoundError,
  getPieChart,
} from "@/features/pie-chart/pie-chart-queries";

// Research runs for up to 55s (TIMEOUT_MS).
export const maxDuration = 60;

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic")?.trim() ?? "";

  if (!topic) {
    return Response.json(
      {
        error: "Pass a topic, for example US electricity generation by source.",
      },
      { status: 400 }
    );
  }

  try {
    const data = await getPieChart(topic);
    return Response.json(data, {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof PieChartNotFoundError ? 404 : 502;
    return Response.json(
      {
        error: Error.isError(error) ? error.message : "Pie chart failed.",
      },
      { status }
    );
  }
}

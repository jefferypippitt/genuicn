import {
  RadialChartNotFoundError,
  getRadialChart,
} from "@/features/radial-chart/radial-chart-queries";

// Research runs for up to 55s (TIMEOUT_MS).
export const maxDuration = 60;

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic")?.trim() ?? "";

  if (!topic) {
    return Response.json(
      { error: "Pass a topic, for example California reservoir levels." },
      { status: 400 }
    );
  }

  try {
    const data = await getRadialChart(topic);
    return Response.json(data, {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof RadialChartNotFoundError ? 404 : 502;
    return Response.json(
      {
        error: Error.isError(error) ? error.message : "Radial chart failed.",
      },
      { status }
    );
  }
}

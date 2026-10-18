import { getCupGroup } from "@/features/nba-cup/nba-cup-queries";
import { errorMessage, parseCupGroup } from "@/features/nba-cup/nba-cup-schema";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

const UPSTREAM_FAILED = 502;

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const group = parseCupGroup(searchParams.get("group") ?? "");
  if (!group) {
    return Response.json(
      {
        error:
          'Pass an NBA Cup group: "east-a", "east-b", "east-c", "west-a", "west-b" or "west-c".',
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getCupGroup(group), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "NBA Cup lookup failed.") },
      { status: UPSTREAM_FAILED }
    );
  }
}

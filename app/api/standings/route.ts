import { getStandings } from "@/features/standings/standings-queries";
import {
  errorMessage,
  parseConference,
} from "@/features/standings/standings-schema";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

const UPSTREAM_FAILED = 502;

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conference = parseConference(searchParams.get("conference") ?? "");
  if (!conference) {
    return Response.json(
      { error: 'Pass a conference: "east" or "west".' },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getStandings(conference), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Standings lookup failed.") },
      { status: UPSTREAM_FAILED }
    );
  }
}

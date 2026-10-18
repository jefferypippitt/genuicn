import {
  getScoreboard,
  ScoreboardNotFoundError,
} from "@/features/scoreboard/scoreboard-queries";
import {
  errorMessage,
  isGameDate,
  normalizeTeam,
} from "@/features/scoreboard/scoreboard-schema";

const CACHE = "public, s-maxage=15, stale-while-revalidate=30";

const UPSTREAM_FAILED = 502;

function statusOf(error: unknown) {
  return error instanceof ScoreboardNotFoundError
    ? error.status
    : UPSTREAM_FAILED;
}

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = normalizeTeam(searchParams.get("team") ?? "");
  const date = searchParams.get("date") ?? undefined;

  const isDateValid = date === undefined || isGameDate(date);
  if (!(team && isDateValid)) {
    return Response.json(
      {
        error:
          'Pass an NBA team such as "Los Angeles Lakers", and optionally a date as YYYY-MM-DD.',
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getScoreboard(team, date), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Score lookup failed.") },
      { status: statusOf(error) }
    );
  }
}

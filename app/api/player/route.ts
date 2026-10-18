import {
  getPlayer,
  PlayerNotFoundError,
} from "@/features/player/player-queries";
import { errorMessage, normalizeName } from "@/features/player/player-schema";

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

const UPSTREAM_FAILED = 502;

function statusOf(error: unknown) {
  return error instanceof PlayerNotFoundError ? error.status : UPSTREAM_FAILED;
}

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const player = normalizeName(searchParams.get("player"));
  if (!player) {
    return Response.json(
      { error: 'Pass an NBA player such as "LeBron James".' },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getPlayer(player), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Player lookup failed.") },
      { status: statusOf(error) }
    );
  }
}

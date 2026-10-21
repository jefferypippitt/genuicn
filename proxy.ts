import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";

const FORBIDDEN = 403;

/**
Blocks bots from the routes that spend this site's AI Gateway and Parallel credits. It lives outside the registry, so installed apps never get it. The check runs only on Vercel: BotID needs Vercel's request context, and local dev, tests and scripts would otherwise fail.
*/
export async function proxy() {
  if (process.env.VERCEL !== "1") {
    return NextResponse.next();
  }
  const { isBot } = await checkBotId();
  return isBot
    ? NextResponse.json({ error: "Access denied." }, { status: FORBIDDEN })
    : NextResponse.next();
}

// Keep in sync with the protect list in instrumentation-client.ts.
export const config = {
  matcher: [
    "/api/chat",
    "/api/area-chart",
    "/api/bar-chart",
    "/api/pie-chart",
    "/api/radar-chart",
    "/api/radial-chart",
  ],
};

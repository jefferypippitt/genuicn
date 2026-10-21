import {
  CandlestickNotFoundError,
  getCandlestick,
} from "@/features/candlestick/candlestick-queries";
import {
  errorMessage,
  isCandlestickRange,
  normalizeTicker,
} from "@/features/candlestick/candlestick-schema";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const UPSTREAM_FAILED = 502;

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = normalizeTicker(searchParams.get("ticker") ?? "");
  const range = searchParams.get("range") ?? "1m";

  if (!(ticker && isCandlestickRange(range))) {
    return Response.json(
      {
        error:
          "Pass a ticker such as NVDA, and optionally a range of 1d, 1w, 1m, 6m or 1y.",
      },
      { status: BAD_REQUEST }
    );
  }

  try {
    return Response.json(await getCandlestick(ticker, range), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status =
      error instanceof CandlestickNotFoundError ? NOT_FOUND : UPSTREAM_FAILED;
    return Response.json(
      { error: errorMessage(error, "Chart lookup failed.") },
      { status }
    );
  }
}

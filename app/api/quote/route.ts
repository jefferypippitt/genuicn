import { getQuote, QuoteNotFoundError } from "@/features/quote/quote-queries";
import { QUOTE_RANGES } from "@/features/quote/quote-schema";
import type { QuoteRange } from "@/features/quote/quote-schema";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.trim().toUpperCase();
  const range = searchParams.get("range") ?? "1d";

  if (!ticker || !(QUOTE_RANGES as readonly string[]).includes(range)) {
    return Response.json(
      { error: "Pass a ticker and a range of 1d, 1w, 1m or 1y." },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getQuote(ticker, range as QuoteRange), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    const status = error instanceof QuoteNotFoundError ? 404 : 502;
    return Response.json(
      { error: Error.isError(error) ? error.message : "Quote failed." },
      { status }
    );
  }
}

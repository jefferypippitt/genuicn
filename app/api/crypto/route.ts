import { CryptoLookupError, getCrypto } from "@/features/crypto/crypto-queries";
import {
  errorMessage,
  isCryptoRange,
  normalizeCryptoSymbol,
} from "@/features/crypto/crypto-schema";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

const UPSTREAM_FAILED = 502;

function statusOf(error: unknown) {
  return error instanceof CryptoLookupError ? error.status : UPSTREAM_FAILED;
}

// eslint-disable-next-line sonarjs/function-name -- Next.js route handlers must be named after the HTTP method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = normalizeCryptoSymbol(searchParams.get("symbol") ?? "");
  const range = searchParams.get("range") ?? "24h";

  if (!(symbol && isCryptoRange(range))) {
    return Response.json(
      {
        error:
          'Pass a coin symbol such as "BTC", and optionally a range of 24h, 1w, 1m, 1y or all.',
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await getCrypto(symbol, range), {
      headers: { "Cache-Control": CACHE },
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Crypto lookup failed.") },
      { status: statusOf(error) }
    );
  }
}

"use client";

import { QuoteCard } from "@/features/quote/components/quote-card";
import { GALLERY_QUOTES } from "@/features/home/gallery-snapshot";
import type { QuoteRange } from "@/features/quote/quote-schema";

function loadSavedRange(_ticker: string, range: QuoteRange) {
  return Promise.resolve(GALLERY_QUOTES[range]);
}

export default function GalleryQuote() {
  return (
    <QuoteCard
      state="ready"
      data={GALLERY_QUOTES["1d"]}
      loadRange={loadSavedRange}
      showAsOf={false}
    />
  );
}

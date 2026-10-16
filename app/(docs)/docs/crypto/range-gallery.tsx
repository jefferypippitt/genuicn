"use client";

import { useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { CryptoCard } from "@/features/crypto/components/crypto-card";
import { FAKE_COINS, fakeCrypto } from "@/features/crypto/crypto-fake";
import {
  CRYPTO_RANGE_LABEL,
  CRYPTO_RANGES,
} from "@/features/crypto/crypto-schema";

export default function RangeGallery() {
  const [selected, setSelected] = useState(0);
  const range = CRYPTO_RANGES[selected];
  return (
    <div className="flex flex-col gap-4">
      <TabsSubtle selectedIndex={selected} onSelect={setSelected}>
        {CRYPTO_RANGES.map((option, index) => (
          <TabsSubtleItem
            key={option}
            index={index}
            label={CRYPTO_RANGE_LABEL[option]}
          />
        ))}
      </TabsSubtle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FAKE_COINS.map((coin) => (
          <figure key={coin.symbol} className="flex flex-col gap-2">
            <CryptoCard state="ready" data={fakeCrypto(coin, range)} />
            <figcaption className="text-muted-foreground">
              {coin.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

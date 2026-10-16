"use client";

import { CopyPromptButton } from "@/components/docs/copy-prompt-button";
import { INSTALL_PROMPTS } from "@/lib/docs/install-prompt";
import type { InstallCard } from "@/lib/docs/install-prompt";

export function InstallPromptButton({
  card,
  label,
}: {
  readonly card: InstallCard;
  readonly label?: string;
}) {
  return (
    <CopyPromptButton
      label={label}
      prompt={() => INSTALL_PROMPTS[card](window.location.origin)}
    />
  );
}

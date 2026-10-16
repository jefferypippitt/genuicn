import { z } from "zod";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const CardGroup = ({
  children,
  className,
}: {
  readonly children?: ReactNode;
  readonly className?: string;
}) => (
  <div className={cn("@container w-full", className)}>
    <div className="grid grid-cols-1 items-start gap-3 @2xl:grid-cols-2">
      {children}
    </div>
  </div>
);

export const cardGroupCatalogEntry = {
  description:
    "Holds several cards in one reply. Use it as the root whenever the reply shows more than one card, with one card per child.",
  props: z.object({}),
  slots: ["default"],
};

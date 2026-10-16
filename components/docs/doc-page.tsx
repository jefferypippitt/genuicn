"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { CopyPromptButton } from "@/components/docs/copy-prompt-button";
import { INSTALL_PROMPTS } from "@/lib/docs/install-prompt";
import { PAGE_ORDER } from "@/components/sidebar-app/nav-data";
import { useIcons } from "@/lib/icon-context";
import { useSize } from "@/lib/size-context";
import { fontWeights } from "@/lib/font-weight";
import { cn } from "@/lib/utils";
import type { InstallCard } from "@/lib/docs/install-prompt";
import type { ReactNode } from "react";

export const DocPage = ({
  title,
  description,
  href,
  install,
  children,
}: {
  readonly title: string;
  readonly description: ReactNode;
  readonly href?: string;
  readonly install?: {
    readonly note: string;
    readonly card: InstallCard;
    readonly title?: string;
  };
  readonly children?: ReactNode;
}) => {
  const { type } = useSize();
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1
            className={cn(type.display, "text-foreground")}
            style={{ fontVariationSettings: fontWeights.bold }}
          >
            {title}
          </h1>
          {href ? <PageArrows href={href} /> : null}
        </div>
        <p className={cn(type.body, "text-muted-foreground")}>{description}</p>
      </header>
      {install ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              className={cn(type.subtitle, "text-foreground")}
              style={{ fontVariationSettings: fontWeights.semibold }}
            >
              {install.title ?? "Installation"}
            </h2>
            <p className={cn(type.body, "text-muted-foreground")}>
              {install.note}
            </p>
          </div>
          <CopyPromptButton
            prompt={() => INSTALL_PROMPTS[install.card](window.location.origin)}
          />
        </div>
      ) : null}
      {children}
    </article>
  );
};

const PageArrows = ({ href }: { readonly href: string }) => {
  const { variant } = useSize();
  const ArrowRight = useIcons()["arrow-right"];
  const size = variant === "compact" ? "icon-compact" : "icon";
  const index = PAGE_ORDER.findIndex((page) => page.href === href);
  const previous = index > 0 ? PAGE_ORDER[index - 1] : null;
  const next =
    index !== -1 && index < PAGE_ORDER.length - 1
      ? PAGE_ORDER[index + 1]
      : null;

  return (
    <div className="-my-2 flex shrink-0 items-center gap-1">
      {previous ? (
        <Tooltip content={<ArrowHint label={previous.label} keyGlyph="←" />}>
          <Button
            variant="ghost"
            size={size}
            render={<Link href={previous.href} />}
            aria-label={`Previous: ${previous.label}`}
          >
            <ArrowRight className="rotate-180" />
          </Button>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size={size}
          disabled
          aria-label="No previous page"
        >
          <ArrowRight className="rotate-180" />
        </Button>
      )}
      {next ? (
        <Tooltip content={<ArrowHint label={next.label} keyGlyph="→" />}>
          <Button
            variant="ghost"
            size={size}
            render={<Link href={next.href} />}
            aria-label={`Next: ${next.label}`}
          >
            <ArrowRight />
          </Button>
        </Tooltip>
      ) : (
        <Button variant="ghost" size={size} disabled aria-label="No next page">
          <ArrowRight />
        </Button>
      )}
    </div>
  );
};

const ArrowHint = ({
  label,
  keyGlyph,
}: {
  readonly label: string;
  readonly keyGlyph: string;
}) => (
  <span>
    {label}&ensp;
    <kbd className="text-muted-foreground font-mono">{keyGlyph}</kbd>
  </span>
);

function renderPrinciple(
  item: { readonly title: string; readonly body: ReactNode },
  titleClass: string
) {
  return (
    <div key={item.title} className="flex flex-col gap-2">
      <h3
        className={cn(titleClass, "text-foreground leading-none")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {item.title}
      </h3>
      <p>{item.body}</p>
    </div>
  );
}

export const DocPrinciples = ({
  items,
}: {
  readonly items: readonly {
    readonly title: string;
    readonly body: ReactNode;
  }[];
}) => {
  const { type } = useSize();
  return (
    <section
      className={cn(type.body, "text-muted-foreground flex flex-col gap-6")}
    >
      {items.map((item) => renderPrinciple(item, type.subtitle))}
    </section>
  );
};

export const DocStep = ({
  number,
  label,
  children,
}: {
  readonly number: number;
  readonly label: ReactNode;
  readonly children: ReactNode;
}) => {
  const { type } = useSize();
  return (
    <div className="mt-2 flex flex-col gap-2">
      <p
        className={cn(
          type.body,
          "text-muted-foreground ml-1 flex items-center gap-2"
        )}
      >
        <span
          className="bg-muted text-muted-foreground inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] leading-3.5"
          style={{ fontVariationSettings: fontWeights.normal }}
        >
          {number}
        </span>
        {label}
      </p>
      {children}
    </div>
  );
};

export function DocDivider({ className }: { readonly className?: string }) {
  return <hr className={cn("border-border/60", className)} />;
}

export const DocSection = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => {
  const { type } = useSize();
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={cn(type.subtitle, "text-foreground")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {title}
      </h2>
      <div className={cn(type.body, "text-foreground flex flex-col gap-3")}>
        {children}
      </div>
    </section>
  );
};

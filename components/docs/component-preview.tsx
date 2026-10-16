"use client";

import { useEffect, useState } from "react";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { highlight } from "@/lib/docs/highlight";
import { useShape } from "@/lib/shape-context";
import { cn } from "@/lib/utils";
import type {
  HighlightedCode,
  HighlightLine,
  HighlightToken,
} from "@/lib/docs/highlight";
import type { CSSProperties, ReactNode } from "react";

// After Fluid Functionalism's lib/docs/ComponentPreview.tsx (MIT).

interface TokenColorStyle extends CSSProperties {
  "--shiki-dark"?: string;
  "--shiki-light"?: string;
}

function tokenStyle(
  light: string | undefined,
  dark: string | undefined
): TokenColorStyle {
  const style: TokenColorStyle = {};
  if (dark) {
    style["--shiki-dark"] = dark;
  }
  if (light) {
    style["--shiki-light"] = light;
  }
  return style;
}

function TokenSpan({ token }: { readonly token: HighlightToken }) {
  return <span style={tokenStyle(token.light, token.dark)}>{token.text}</span>;
}

function renderToken(token: HighlightToken) {
  return <TokenSpan key={token.offset} token={token} />;
}

function LineSpan({
  line,
  isLast,
}: {
  readonly line: HighlightLine;
  readonly isLast: boolean;
}) {
  const tokens = Array.from(line.tokens, renderToken);
  return (
    <span className="line">
      {tokens}
      {isLast ? null : "\n"}
    </span>
  );
}

function CodeLines({ highlighted }: { readonly highlighted: HighlightedCode }) {
  const { foreground, lines } = highlighted;
  function renderLine(line: HighlightLine, index: number) {
    return (
      <LineSpan
        isLast={index === lines.length - 1}
        key={line.offset}
        line={line}
      />
    );
  }
  const rows = Array.from(lines, renderLine);
  return (
    <pre
      className="shiki"
      style={tokenStyle(foreground.light, foreground.dark)}
    >
      <code>{rows}</code>
    </pre>
  );
}

export const ComponentPreview = ({
  code,
  actions,
  heightClass = "h-[520px]",
  children,
}: {
  readonly code: string;
  readonly actions?: ReactNode;
  readonly heightClass?: string;
  readonly children: ReactNode;
}) => {
  const [tab, setTab] = useState(0);
  const [highlighted, setHighlighted] = useState<HighlightedCode | null>(null);
  const shape = useShape();

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      const result = await highlight(code);
      if (!isCancelled) {
        setHighlighted(result);
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [code]);

  return (
    <div
      className={cn(
        "border-border/60 focus-within:border-foreground/40 relative isolate flex w-full flex-col border transition-[border-color] duration-150",
        shape.container
      )}
    >
      <div
        className="border-border/60 bg-background flex min-h-[52px] items-center gap-2 border-b px-3 py-2"
        style={{
          borderTopLeftRadius: "inherit",
          borderTopRightRadius: "inherit",
        }}
      >
        <TabsSubtle selectedIndex={tab} onSelect={setTab}>
          <TabsSubtleItem index={0} label="Preview" />
          <TabsSubtleItem index={1} label="Code" />
        </TabsSubtle>
        {tab === 0 && actions ? (
          <div className="ml-auto flex items-center gap-1">{actions}</div>
        ) : null}
      </div>

      <div
        className={cn("overflow-hidden", heightClass)}
        style={{
          borderBottomLeftRadius: "inherit",
          borderBottomRightRadius: "inherit",
        }}
      >
        <div className={cn("bg-background h-full", tab !== 0 && "hidden")}>
          {children}
        </div>
        {tab === 1 && highlighted ? (
          <div className="h-full overflow-auto font-mono text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] [&_.shiki]:bg-transparent! [&_.shiki_span]:text-(--shiki-light) dark:[&_.shiki_span]:text-(--shiki-dark) [&_pre]:m-0 [&_pre]:p-4">
            <CodeLines highlighted={highlighted} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

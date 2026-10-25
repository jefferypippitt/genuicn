"use client";

import { useEffect, useState } from "react";
import { CARD_SURFACE } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import { highlightCode } from "@/features/code-block/code-block-highlight";
import {
  calloutLines,
  languageLook,
  normalizeLanguage,
} from "@/features/code-block/code-block-schema";
import type { CSSProperties } from "react";
import type {
  CodeLine,
  CodeToken,
} from "@/features/code-block/code-block-highlight";

/**
Past this many lines the block folds, showing the first FOLDED_LINES with a fade and a button for the rest.
*/
const FOLD_AFTER = 20;
const FOLDED_LINES = 14;
const COPIED_MS = 1600;

const ICON_BUTTON =
  "focus-visible:ring-ring text-muted-foreground hover:text-foreground hover:bg-background flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40";

/**
What came back for one piece of code. A result for older code reads as not highlighted yet, so an edit never flashes stale colors.
*/
interface Highlighted {
  readonly key: string;
  readonly lines: CodeLine[] | null;
}

type TokenStyle = CSSProperties & {
  "--shiki-light"?: string;
  "--shiki-dark"?: string;
};

function tokenStyle(token: CodeToken): TokenStyle {
  return { "--shiki-dark": token.dark, "--shiki-light": token.light };
}

function splitLines(code: string): string[] {
  return code.replace(/\n$/u, "").split("\n");
}

// Inline icons, so the card installs without an icon library.
const CopyIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="size-3.5 text-emerald-600 dark:text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function useCopy(text: string) {
  const [isCopied, setIsCopied] = useState(false);
  useEffect(() => {
    // Runs on every change; resetting an already-false flag is a no-op.
    const timer = setTimeout(() => setIsCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };
  return { copy, isCopied };
}

/**
Shiki's tokens for the code, once the model has finished writing it. Highlighting every streamed chunk would re-run the grammar dozens of times a second, so streaming code stays plain.
*/
function useHighlighted(code: string, language: string, isStreaming: boolean) {
  const [result, setResult] = useState<Highlighted | null>(null);
  const key = `${language}\n${code}`;
  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      let lines: CodeLine[] | null;
      try {
        lines = await highlightCode(code.replace(/\n$/u, ""), language);
      } catch {
        lines = null;
      }
      if (!isCancelled) {
        setResult({ key, lines });
      }
    };
    if (!isStreaming && code) {
      run();
    }
    return () => {
      isCancelled = true;
    };
  }, [key, code, language, isStreaming]);
  return result?.key === key ? result.lines : null;
}

const CodeText = ({
  text,
  tokens,
}: {
  readonly text: string;
  readonly tokens: CodeLine | undefined;
}) => {
  if (!tokens) {
    return text;
  }
  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={index}
          style={tokenStyle(token)}
          className="text-(--shiki-light) dark:text-(--shiki-dark)"
        >
          {token.text}
        </span>
      ))}
    </>
  );
};

/**
The model's cursor: a block that blinks at the end of the code while it is still being written.
*/
const Caret = () => (
  <span
    aria-hidden
    className="bg-foreground/70 ml-px inline-block h-[1.1em] w-[0.55em] animate-pulse align-text-bottom motion-reduce:animate-none"
  />
);

/**
A code block for chat replies: the code the model wrote, highlighted for its language, with its language, line numbers, called-out lines and a copy button.
*/
export default function CodeBlockCard({
  code = "",
  language,
  filename,
  highlight,
  streaming = false,
  className,
}: {
  readonly code?: string;
  readonly language?: string | null;
  /**
  The file the code belongs in; it names the code for the copy button.
  */
  readonly filename?: string | null;
  /**
  Line numbers (from 1) to call out.
  */
  readonly highlight?: readonly number[] | null;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lang = normalizeLanguage(language);
  const look = languageLook(lang);
  const lines = splitLines(code);
  const tokens = useHighlighted(code, lang, streaming);
  const callouts = calloutLines(highlight, lines.length);
  const { copy, isCopied } = useCopy(code);

  const canFold = !streaming && lines.length > FOLD_AFTER;
  const isFolded = canFold && !isExpanded;
  const shown = isFolded ? lines.slice(0, FOLDED_LINES) : lines;
  const gutter = `${String(lines.length).length + 1}ch`;
  const title = filename?.trim() || look.label;

  return (
    <figure
      aria-busy={streaming}
      className={cn(
        CARD_SURFACE,
        "col-span-full w-full max-w-2xl overflow-hidden rounded-2xl",
        className
      )}
    >
      <figcaption className="bg-muted/50 flex h-10 items-center justify-end gap-2 border-b pr-1.5 pl-3">
        {streaming ? (
          <span className="text-muted-foreground mr-auto text-xs">
            Writing…
          </span>
        ) : null}
        <span className="text-muted-foreground shrink-0 text-xs">
          {look.label}
        </span>
        <button
          type="button"
          disabled={streaming || !code}
          onClick={copy}
          aria-label={isCopied ? "Copied" : `Copy ${title}`}
          className={ICON_BUTTON}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <span className="sr-only" aria-live="polite">
          {isCopied ? "Copied to clipboard" : ""}
        </span>
      </figcaption>

      <div className="relative">
        <pre className="overflow-x-auto py-3 font-mono text-[13px] leading-5">
          <code className="block w-max min-w-full">
            {shown.map((text, index) => {
              const number = index + 1;
              const isCallout = callouts.has(number);
              const isLast = streaming && number === lines.length;
              return (
                <span
                  // eslint-disable-next-line react-doctor/no-array-index-as-key -- a line's number is its identity: code lines never reorder
                  key={number}
                  className={cn(
                    "flex pr-4",
                    isCallout &&
                      "bg-amber-500/10 shadow-[inset_2px_0_0_var(--color-amber-500)]"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "shrink-0 pr-4 text-right tabular-nums select-none",
                      isCallout
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground/60"
                    )}
                    style={{ width: `calc(${gutter} + 1rem)` }}
                  >
                    {number}
                  </span>
                  <span className="min-w-0">
                    <CodeText text={text} tokens={tokens?.[index]} />
                    {isLast ? <Caret /> : null}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
        {isFolded ? (
          <div
            aria-hidden
            className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t"
          />
        ) : null}
      </div>

      {canFold ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full border-t py-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          {isExpanded ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      ) : null}
    </figure>
  );
}

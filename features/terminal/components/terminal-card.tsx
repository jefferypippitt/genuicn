"use client";

import { useEffect, useState } from "react";
import { CARD_SURFACE } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import {
  PROMPT_GLYPH,
  SHELL_LABEL,
  TERMINAL_SHELLS,
  outputTone,
} from "@/features/terminal/terminal-schema";
import type {
  OutputTone,
  TerminalShell,
  TerminalStep,
} from "@/features/terminal/terminal-schema";

const COPIED_MS = 1600;

/**
The terminal follows the page's theme, like the code block, so each tone has a light and a dark shade.
*/
const TONE: Record<OutputTone, string> = {
  error: "text-red-600 dark:text-red-400",
  plain: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-300",
};

const ICON_BUTTON =
  "focus-visible:ring-ring text-muted-foreground hover:text-foreground hover:bg-background flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40";

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

const CopyButton = ({
  text,
  label,
  disabled = false,
  className,
}: {
  readonly text: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly className?: string;
}) => {
  const { copy, isCopied } = useCopy(text);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={copy}
        aria-label={isCopied ? "Copied" : label}
        className={cn(ICON_BUTTON, className)}
      >
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <span className="sr-only" aria-live="polite">
        {isCopied ? "Copied to clipboard" : ""}
      </span>
    </>
  );
};

/**
The shell's cursor: a block that blinks where the next character goes.
*/
const Cursor = () => (
  <span
    aria-hidden
    className="bg-foreground/70 ml-px inline-block h-[1.1em] w-[0.55em] animate-pulse align-text-bottom motion-reduce:animate-none"
  />
);

/**
The prompt before each command. zsh's arrow turns red after a command that printed an error, the way the default theme does.
*/
const Prompt = ({
  shell,
  cwd,
  hasFailed,
}: {
  readonly shell: TerminalShell;
  readonly cwd: string | null;
  readonly hasFailed: boolean;
}) => {
  if (shell === "powershell") {
    return (
      <span aria-hidden className="text-muted-foreground shrink-0 select-none">
        PS {cwd ?? "C:\\"}
        {PROMPT_GLYPH.powershell}{" "}
      </span>
    );
  }
  return (
    <span aria-hidden className="shrink-0 select-none">
      <span className="text-sky-600 dark:text-sky-400">{cwd ?? "~"}</span>{" "}
      <span
        className={
          hasFailed
            ? "text-red-600 dark:text-red-400"
            : "text-emerald-600 dark:text-emerald-400"
        }
      >
        {PROMPT_GLYPH[shell]}
      </span>{" "}
    </span>
  );
};

function trimTrailingNewlines(text: string) {
  let end = text.length;
  while (end > 0 && text[end - 1] === "\n") {
    end -= 1;
  }
  return text.slice(0, end);
}

/**
What a command printed. Trailing newlines are dropped so the output never ends on an empty row.
*/
const Output = ({ text }: { readonly text: string }) => (
  <div className="pb-1">
    {trimTrailingNewlines(text)
      .split("\n")
      .map((line, index) => (
        <div
          // eslint-disable-next-line react-doctor/no-array-index-as-key -- a line's place is its identity: output lines never reorder
          key={index}
          className={cn("min-h-5", TONE[outputTone(line)])}
        >
          {line}
        </div>
      ))}
  </div>
);

function hasError(output: string | null | undefined) {
  return (
    typeof output === "string" &&
    output.split("\n").some((line) => outputTone(line) === "error")
  );
}

const NO_STEPS: readonly TerminalStep[] = [];

/**
A terminal for chat replies: the commands to run, in order, each with a copy button, and what they print when it helps.
*/
export default function TerminalCard({
  steps = NO_STEPS,
  shell,
  cwd,
  streaming = false,
  className,
}: {
  readonly steps?: readonly TerminalStep[];
  /**
  Null or left out: zsh.
  */
  readonly shell?: TerminalShell | null;
  readonly cwd?: string | null;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const shellName: TerminalShell =
    TERMINAL_SHELLS.find((name) => name === shell) ?? "zsh";
  const trimmedCwd = typeof cwd === "string" ? cwd.trim() : "";
  const directory = trimmedCwd === "" ? null : trimmedCwd;
  const commands = steps.flatMap((step) => {
    const command = step.command?.trim();
    return command ? [command] : [];
  });

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
          {SHELL_LABEL[shellName]}
        </span>
        <CopyButton
          text={commands.join("\n")}
          label="Copy all commands"
          disabled={streaming || commands.length === 0}
        />
      </figcaption>

      <div className="max-h-[28rem] overflow-auto px-4 py-3 font-mono text-[13px] leading-5">
        {steps.map((step, index) => {
          const command = step.command ?? "";
          const isWriting = streaming && index === steps.length - 1;
          return (
            <div
              // eslint-disable-next-line react-doctor/no-array-index-as-key -- steps have no id, and the model only ever appends them
              key={index}
              className="group"
            >
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 py-0.5 break-all whitespace-pre-wrap">
                  <Prompt
                    shell={shellName}
                    cwd={directory}
                    hasFailed={index > 0 && hasError(steps[index - 1]?.output)}
                  />
                  <span>{command}</span>
                  {isWriting && !step.output ? <Cursor /> : null}
                </p>
                {command && !isWriting ? (
                  <CopyButton
                    text={command}
                    label={`Copy ${command}`}
                    className="-my-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  />
                ) : null}
              </div>
              {step.output ? <Output text={step.output} /> : null}
            </div>
          );
        })}
        {streaming && steps.length === 0 ? (
          <p className="py-0.5">
            <Prompt shell={shellName} cwd={directory} hasFailed={false} />
            <Cursor />
          </p>
        ) : null}
      </div>
    </figure>
  );
}

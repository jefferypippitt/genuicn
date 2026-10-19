"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Chat as ChatInstance, useChat } from "@ai-sdk/react";
import { Chat } from "@/features/chat/components/chat";
import { ComponentPreview } from "@/components/docs/component-preview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { primeCardData, ReplayTransport } from "@/lib/docs/chat-recording";
import { fontWeights } from "@/lib/font-weight";
import { useIcons } from "@/lib/icon-context";
import { useRightRailNode } from "@/lib/right-rail";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { cn } from "@/lib/utils";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { UIMessage } from "ai";

const IS_LIVE = process.env.NODE_ENV === "development";

export interface PlaygroundRun {
  readonly label: string;
  readonly recording: ChatRecording;
}

export const ChatPlayground = ({
  runs,
  code,
  placeholder,
}: {
  readonly runs: readonly PlaygroundRun[];
  readonly code: string;
  readonly placeholder: string;
}) => {
  const [transport] = useState(() => new ReplayTransport());
  const [chat] = useState(
    () => new ChatInstance<UIMessage>({ id: "playground", transport })
  );
  const { sendMessage, setMessages, status, stop } = useChat({ chat });
  const [runIndex, setRunIndex] = useState(0);
  const { variant } = useSize();
  const RerunIcon = useIcons()["rotate-ccw"];
  const isBusy = status === "submitted" || status === "streaming";

  const play = useCallback(
    async (index: number) => {
      const run = runs[index];
      if (!run) {
        return;
      }
      stop();
      setMessages([]);
      primeCardData(run.recording);
      transport.recording = run.recording;
      transport.mode = "replay";
      for (const turn of run.recording.turns) {
        // eslint-disable-next-line no-await-in-loop -- turns play in order
        await sendMessage({ text: turn.prompt });
      }
      if (IS_LIVE) {
        transport.mode = "live";
      }
    },
    [runs, sendMessage, setMessages, stop, transport]
  );

  useEffect(() => {
    const timer = setTimeout(() => play(0), 0);
    return () => clearTimeout(timer);
  }, []);

  const selectRun = (index: number) => {
    setRunIndex(index);
    play(index);
  };

  const rerun = (
    <Tooltip content="Rerun" side="top">
      <Button
        variant="ghost"
        size={variant === "compact" ? "icon-compact" : "icon"}
        onClick={() => play(runIndex)}
        disabled={isBusy}
        aria-label="Rerun"
      >
        <RerunIcon />
      </Button>
    </Tooltip>
  );

  const controls = (
    <PlaygroundControls runs={runs} value={runIndex} onChange={selectRun} />
  );

  return (
    <div className="flex flex-col gap-4">
      <ComponentPreview code={code} actions={rerun}>
        <Chat
          chat={chat}
          disabled={!IS_LIVE}
          placeholder={
            IS_LIVE
              ? placeholder
              : (runs[runIndex]?.recording.turns[0]?.prompt ?? "")
          }
          className="h-full"
        />
      </ComponentPreview>
      <div className="xl:hidden">{controls}</div>
      <RailPortal>{controls}</RailPortal>
    </div>
  );
};

const RailPortal = ({ children }: { readonly children: React.ReactNode }) => {
  const node = useRightRailNode();
  return node ? createPortal(children, node) : null;
};

const PlaygroundControls = ({
  runs,
  value,
  onChange,
}: {
  readonly runs: readonly PlaygroundRun[];
  readonly value: number;
  readonly onChange: (index: number) => void;
}) => {
  const shape = useShape();
  const { type } = useSize();
  return (
    <section
      aria-label="Playground"
      className={cn("bg-muted p-4", shape.container)}
    >
      <h2
        className={cn(type.title, "text-foreground py-1")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        Playground
      </h2>
      {/* Label above a full-width picker: prompts can be whole questions, so
          the trigger and its rows wrap instead of truncating. */}
      <div className="mt-2 flex flex-col gap-1">
        <span className={cn(type.body, "text-muted-foreground px-1")}>
          Prompt
        </span>
        <Select
          value={String(value)}
          onValueChange={(next) => onChange(Number(next))}
        >
          <SelectTrigger
            variant="borderless"
            multiline
            aria-label="Prompt"
            className="w-full min-w-0"
          />
          <SelectContent className="w-[var(--anchor-width)]">
            {runs.map((run, index) => (
              <SelectItem
                key={run.label}
                value={String(index)}
                index={index}
                multiline
              >
                {run.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

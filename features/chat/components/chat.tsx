"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  JSONUIProvider,
  Renderer,
  buildSpecFromParts,
  useJsonRenderMessage,
} from "@json-render/react";
import { getToolName, isToolUIPart } from "ai";
import { motion } from "motion/react";
import { ChatDevtools } from "@/features/chat/components/chat-devtools";
import { ChatMessage } from "@/components/ui/chat-message";
import { InputMessage } from "@/components/ui/input-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { catalog } from "@/features/chat/chat-catalog";
import CitedAnswer from "@/features/chat/components/cited-answer";
import { ReplySteps } from "@/features/chat/components/reply-steps";
import { registry } from "@/features/chat/chat-registry";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { WebSearchProgress } from "@/features/chat/components/reply-steps";
import type { Chat as ChatInstance } from "@ai-sdk/react";
import type { UIMessage } from "ai";

const PINNED_PX = 48;

/**
The element that scrolls inside a Fluid ScrollArea: its ref points at the outer root, and the viewport inside it does the scrolling.
*/
function viewportOf(root: HTMLElement | null) {
  return (
    root?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ??
    null
  );
}

const SUGGESTIONS = [
  "How's NVDA doing?",
  "Show me Apple over the past year",
  "How did Tesla do this week?",
];

export const Chat = ({
  chat,
  input = true,
  disabled = false,
  placeholder = "Ask about a stock…",
  className,
}: {
  /** An AI SDK chat instance to drive, e.g. one with a custom transport.
   *  Omitted, the chat posts to /api/chat. Give it a fixed id. */
  readonly chat?: ChatInstance<UIMessage>;
  /**
  Show the message composer.
  */
  readonly input?: boolean;
  /**
  Show the composer but don't accept messages (a read-only demo).
  */
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
}) => {
  // A fixed id: the AI SDK would otherwise make a random one during render,
  // which a prerender (Cache Components) rejects.
  const { messages, sendMessage, status, stop, error } = useChat(
    chat ? { chat } : { id: "chat" }
  );
  const [draft, setDraft] = useState("");
  const { type } = useSize();

  const scrollReference = useRef<HTMLDivElement>(null);
  const contentReference = useRef<HTMLDivElement>(null);
  const pinnedReference = useRef(true);
  const bottomReference = useRef<HTMLDivElement>(null);
  // Resize observers run before intersection observers in a frame, so growth
  // scrolls first and the marker is still in view when it's checked.
  useEffect(() => {
    const element = viewportOf(scrollReference.current);
    const content = contentReference.current;
    const bottom = bottomReference.current;
    if (!(element && content && bottom)) {
      return;
    }
    const resize = new ResizeObserver(() => {
      if (pinnedReference.current) {
        element.scrollTo({ top: element.scrollHeight });
      }
    });
    const pin = new IntersectionObserver(
      ([entry]) => {
        pinnedReference.current = entry?.isIntersecting ?? true;
      },
      { root: element, rootMargin: `0px 0px ${PINNED_PX}px 0px` }
    );
    resize.observe(content);
    pin.observe(bottom);
    return () => {
      resize.disconnect();
      pin.disconnect();
    };
  }, []);
  useEffect(() => {
    pinnedReference.current = true;
    const element = viewportOf(scrollReference.current);
    element?.scrollTo({ top: element.scrollHeight });
  }, [messages.length]);

  const isBusy = status === "submitted" || status === "streaming";
  const turns = turnsOf(messages);
  const lastId = messages.at(-1)?.id;
  const lastReply = messages.findLast(
    (message) => message.role === "assistant"
  );

  return (
    <JSONUIProvider registry={registry}>
      <ChatDevtools
        spec={lastReply ? buildSpecFromParts(lastReply.parts) : null}
        catalog={catalog}
        messages={messages}
        position="right"
      />
      <div className={cn("flex min-h-0 flex-col", className)}>
        <ScrollArea ref={scrollReference} className="min-h-0 flex-1">
          <div ref={contentReference} className="flex flex-col gap-4 p-4">
            {turns.map((turn, index) => {
              const isLatest = index === turns.length - 1;
              return (
                <Fragment key={turn.id}>
                  {turn.question ? (
                    <ChatMessage from="user">
                      {textOf(turn.question)}
                    </ChatMessage>
                  ) : null}
                  {turn.reply || (isLatest && isBusy) ? (
                    <AssistantMessage
                      message={turn.reply}
                      streaming={
                        isBusy ? !turn.reply || turn.reply.id === lastId : false
                      }
                    />
                  ) : null}
                </Fragment>
              );
            })}
            {error ? (
              <p className={cn(type.caption, "text-muted-foreground")}>
                Something went wrong. Send the message again.
              </p>
            ) : null}
            <div ref={bottomReference} aria-hidden className="-mt-4 h-px" />
          </div>
        </ScrollArea>

        {input ? (
          <div className="p-3 pt-0">
            <InputMessage
              value={draft}
              onValueChange={setDraft}
              onSend={(text) => {
                if (!text) {
                  return;
                }

                sendMessage({ text });
                setDraft("");
              }}
              status={isBusy ? "streaming" : "idle"}
              onStop={stop}
              disabled={disabled}
              placeholder={placeholder}
              suggestions={
                messages.length === 0 && !disabled ? SUGGESTIONS : undefined
              }
            />
          </div>
        ) : null}
      </div>
    </JSONUIProvider>
  );
};

interface Turn {
  id: string;
  question?: UIMessage;
  reply?: UIMessage;
}

function turnsOf(messages: readonly UIMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    const last = turns.at(-1);
    if (message.role === "user") {
      turns.push({ id: message.id, question: message });
    } else if (last && !last.reply) {
      last.reply = message;
    } else {
      turns.push({ id: message.id, reply: message });
    }
  }
  return turns;
}

const NO_PARTS: UIMessage["parts"] = [];

function queriesOf(input: unknown): string[] {
  const queries =
    typeof input === "object" && input !== null && "queries" in input
      ? input.queries
      : undefined;
  return Array.isArray(queries)
    ? queries.filter((query): query is string => typeof query === "string")
    : [];
}

function webSearchOf(parts: UIMessage["parts"]): WebSearchProgress | null {
  const queries: string[] = [];
  const sources: { id: string; title: string; url: string }[] = [];
  let calls = 0;
  let isDone = true;
  for (const part of parts) {
    if (part.type === "source-url") {
      sources.push({
        id: part.sourceId,
        title: part.title ?? part.url,
        url: part.url,
      });
    } else if (isToolUIPart(part) && getToolName(part) === "webSearch") {
      calls += 1;
      queries.push(...queriesOf(part.input));
      isDone &&=
        part.state === "output-available" || part.state === "output-error";
    }
  }
  return calls > 0 ? { isDone, queries, sources } : null;
}

const AssistantMessage = ({
  message,
  streaming,
}: {
  readonly message?: UIMessage;
  readonly streaming: boolean;
}) => {
  const parts = message?.parts ?? NO_PARTS;
  const { spec, text } = useJsonRenderMessage(parts);
  const [isAnswerShown, setIsAnswerShown] = useState(false);
  const search = webSearchOf(parts);
  const isShown = isAnswerShown || (!spec && text.length > 0);
  return (
    <div className="flex flex-col gap-3">
      <ReplySteps
        spec={spec}
        hasText={text.length > 0}
        search={search}
        streaming={streaming}
        onFinish={() => setIsAnswerShown(true)}
      />
      {isShown ? (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.slow}
        >
          {text && search ? (
            <CitedAnswer
              text={text}
              sources={search.sources}
              isComplete={!streaming}
            />
          ) : null}
          {text && !search ? (
            <ChatMessage from="assistant">{text}</ChatMessage>
          ) : null}
          {spec ? (
            <Renderer spec={spec} registry={registry} loading={streaming} />
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
};

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

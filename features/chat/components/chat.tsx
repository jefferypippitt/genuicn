"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  JSONUIProvider,
  Renderer,
  buildSpecFromParts,
  useJsonRenderMessage,
} from "@json-render/react";
import { motion } from "motion/react";
import { ChatDevtools } from "@/features/chat/components/chat-devtools";
import { ChatMessage } from "@/components/ui/chat-message";
import { InputMessage } from "@/components/ui/input-message";
import { catalog } from "@/features/chat/chat-catalog";
import { ReplySteps } from "@/features/chat/components/reply-steps";
import { registry } from "@/features/chat/chat-registry";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { Chat as ChatInstance } from "@ai-sdk/react";
import type { UIMessage } from "ai";

const PINNED_PX = 48;

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
  useEffect(() => {
    const element = scrollReference.current;
    const content = contentReference.current;
    if (!element || !content) {
      return;
    }
    const follow = () => {
      if (pinnedReference.current) {
        element.scrollTo({ top: element.scrollHeight });
      }
    };
    const observer = new ResizeObserver(follow);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    pinnedReference.current = true;
    scrollReference.current?.scrollTo({
      top: scrollReference.current.scrollHeight,
    });
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
        <div
          ref={scrollReference}
          onScroll={(event) => {
            const element = event.currentTarget;
            pinnedReference.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              PINNED_PX;
          }}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4"
        >
          <div ref={contentReference} className="flex flex-col gap-4">
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
          </div>
        </div>

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

const AssistantMessage = ({
  message,
  streaming,
}: {
  readonly message?: UIMessage;
  readonly streaming: boolean;
}) => {
  const { spec, text } = useJsonRenderMessage(message?.parts ?? NO_PARTS);
  const [isAnswerShown, setIsAnswerShown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <ReplySteps
        spec={spec}
        hasText={text.length > 0}
        streaming={streaming}
        onFinish={() => setIsAnswerShown(true)}
      />
      {isAnswerShown ? (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.slow}
        >
          {text ? <ChatMessage from="assistant">{text}</ChatMessage> : null}
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

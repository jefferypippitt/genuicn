"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AskUserQuestions } from "@/components/ui/ask-user-questions";
import { ChatMessage } from "@/components/ui/chat-message";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import DatePicker from "@/features/flights/components/date-picker";
import FlightResults from "@/features/flights/components/flight-results";
import RoutePicker from "@/features/flights/components/route-picker";
import SeatMapPicker from "@/features/flights/components/seat-map";
import { runCheckInConversation } from "@/features/flights/check-in-conversation";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type {
  Answers,
  ConversationEntry,
  ConversationPrompt,
} from "@/features/flights/check-in-conversation";

/**
Runs the conversation and keeps what it has said so far. Unmounting aborts the run, so its waits and questions never land in a later one.
*/
function useConversation() {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [prompt, setPrompt] = useState<ConversationPrompt | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const view = {
      add: (entry: ConversationEntry) =>
        setEntries((previous) => [...previous, entry]),
      clear: () => setEntries([]),
      prompt: setPrompt,
      think: setIsThinking,
    };
    runCheckInConversation(view, controller.signal);
    return () => controller.abort();
  }, []);

  const answer = (answers: Answers) => {
    setPrompt(null);
    prompt?.resolve(answers);
  };

  return { answer, entries, isThinking, prompt };
}

/**
Keeps the newest message in view as the conversation grows.
*/
function useFollow() {
  const scrollReference = useRef<HTMLDivElement>(null);
  const contentReference = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scrollReference.current;
    const content = contentReference.current;
    if (!element || !content) {
      return;
    }
    const observer = new ResizeObserver(() => {
      element.scrollTo({ behavior: "smooth", top: element.scrollHeight });
    });
    observer.observe(content);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { contentReference, scrollReference };
}

const ENTER = {
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 6 },
  transition: spring.slow,
} as const;

function EntryView({ entry }: { readonly entry: ConversationEntry }) {
  if (entry.kind === "route") {
    return (
      <motion.div {...ENTER}>
        <RoutePicker onConfirm={(route) => entry.resolve(route)} />
      </motion.div>
    );
  }
  if (entry.kind === "date") {
    return (
      <motion.div {...ENTER}>
        <DatePicker
          defaultDate={entry.defaultDate}
          onConfirm={(date) => entry.resolve(date)}
        />
      </motion.div>
    );
  }
  if (entry.kind === "flights") {
    return (
      <motion.div {...ENTER}>
        <FlightResults
          offers={entry.offers}
          onConfirm={(flight) => entry.resolve(flight)}
        />
      </motion.div>
    );
  }
  if (entry.kind === "seats") {
    return (
      <motion.div {...ENTER}>
        <SeatMapPicker
          map={entry.data.seatMap}
          flight={entry.data.pass.flight}
          defaultSeat={entry.defaultSeat}
          onConfirm={(seat) => entry.resolve(seat)}
        />
      </motion.div>
    );
  }
  if (entry.kind === "pass") {
    return (
      <motion.div {...ENTER}>
        <BoardingPassCard state="ready" data={entry.data} variant="brand" />
      </motion.div>
    );
  }
  return <ChatMessage from={entry.kind}>{entry.text}</ChatMessage>;
}

/**
An airline check-in assistant with no message box: it asks pre-built questions with Fluid Functionalism's AskUserQuestions where the composer would be (a task to tap, a route card with searchable cities, a booking form whose answers are checked as they're submitted, then baggage, a seat map to pick a seat from, and extras) and ends with the boarding pass in the airline's colors, the way the airline would issue it. The conversation is a script (features/flights/check-in-conversation.ts), so it needs no model.
*/
export default function CheckInAgent({
  className,
}: {
  readonly className?: string;
}) {
  const { answer, entries, isThinking, prompt } = useConversation();
  const { contentReference, scrollReference } = useFollow();

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={scrollReference}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4"
      >
        <div ref={contentReference} className="flex flex-col gap-4">
          {entries.map((entry) => (
            <EntryView key={entry.id} entry={entry} />
          ))}
          {isThinking ? <ThinkingIndicator className="px-0" /> : null}
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        {prompt ? (
          <motion.div
            key={prompt.id}
            className="p-3 pt-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: spring.moderate.exit }}
            transition={spring.moderate}
          >
            <AskUserQuestions
              questions={prompt.questions}
              defaultAnswers={prompt.defaultAnswers}
              onComplete={answer}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

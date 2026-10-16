import { pipeJsonRender } from "@json-render/core";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { catalog } from "@/features/chat/chat-catalog";
import type { UIMessage, UIMessageChunk } from "ai";

export const maxDuration = 30;

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const instructions = catalog.prompt({
  customRules: [
    'When a card fits, your entire reply is the JSONL lines: no sentence before or after them (not even "I\'ll show you…") and no code fences. The chat shows the user its progress itself; the cards are the answer.',
    "When no component fits the user's message (a greeting, a question no card covers), reply with one or two short plain-text sentences instead of JSONL.",
    "Cards fetch their own live data. Never state prices, scores, temperatures or other figures a card shows; anything you write could be out of date.",
    "Show cards only for what the user's latest message asks about. Cards from earlier replies stay visible above, so never repeat them.",
    "A reply has exactly one root element. For one card, the card is the root. For several cards (several stocks in one question), the root is a CardGroup with one card per child; never leave a card outside the root.",
  ],
  mode: "standalone",
});

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const result = streamText({
    instructions: `${instructions}\n\nToday is ${today} (UTC). Work out relative dates such as "tomorrow" from it.`,
    messages: await convertToModelMessages(messages, {
      convertDataPart: (part) =>
        part.type === "data-spec"
          ? { text: `${JSON.stringify(specPatch(part.data))}\n`, type: "text" }
          : undefined,
    }),
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(
          pipeJsonRender(
            toUIMessageStream({ stream: result.stream }).pipeThrough(
              stripFencesAndLeadingBlankLines()
            )
          )
        );
      },
    }),
  });
}

function specPatch(data: unknown) {
  return typeof data === "object" && data !== null && "patch" in data
    ? data.patch
    : data;
}

const FENCE_LINE = /^\s*```[\w-]*\s*$/;

function stripFencesAndLeadingBlankLines() {
  let line = "";
  let id = "";
  let hasContent = false;
  const emit = (
    controller: TransformStreamDefaultController<UIMessageChunk>
  ) => {
    const isNoise = FENCE_LINE.test(line) || (!hasContent && !line.trim());
    if (line && !isNoise) {
      hasContent = true;
      controller.enqueue({ delta: line, id, type: "text-delta" });
    }
    line = "";
  };
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    flush: emit,
    transform(chunk, controller) {
      if (chunk.type === "text-delta") {
        ({ id } = chunk);
        for (const character of chunk.delta) {
          line += character;
          if (character === "\n") {
            emit(controller);
          }
        }
        return;
      }
      if (chunk.type === "text-end") {
        emit(controller);
      }
      controller.enqueue(chunk);
    },
  });
}

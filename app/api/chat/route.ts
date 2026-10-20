import { pipeJsonRender } from "@json-render/core";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { catalog } from "@/features/chat/chat-catalog";
import { createWebSearch, isWebSearchOutput } from "@/features/chat/web-search";
import type { UIMessage, UIMessageChunk } from "ai";

export const maxDuration = 30;

const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
const SEARCH_STEPS = 2;

const instructions = catalog.prompt({
  customRules: [
    'When a card fits, your entire reply is the JSONL lines: no sentence before or after them (not even "I\'ll show you…") and no code fences. The chat shows the user its progress itself; the cards are the answer.',
    "When no component fits a greeting or small talk, reply with one or two short plain-text sentences instead of JSONL.",
    "When no component fits a factual question (history, how many, who, why, a historical estimate broken down by country), call webSearch first without writing anything before it, then answer in 2–4 plain-text sentences. Answer from the search results only, never from memory.",
    "In a web answer, put the number of the result each figure or claim comes from right after it, like [2] or [1][3]. Prefer encyclopedias, official and academic sources over listicle sites. When sources disagree, give the range and cite both. Never write URLs, a source list or reference lines at the end, headings, bold or other markdown: the chat lists the cited sources itself and renders plain text.",
    'For a breakdown (by country, by year), follow the sentences with at most 8 short lines that each start with "- ", the biggest first, e.g. "- Soviet Union: 8.7–11.4 million [1]".',
    "Cards fetch their own live data. Never state prices, scores, temperatures or other figures a card shows; anything you write could be out of date.",
    "Show cards only for what the user's latest message asks about. Cards from earlier replies stay visible above, so never repeat them.",
    "A reply has exactly one root element. For one card, the card is the root. For several cards (several stocks in one question), the root is a CardGroup with one card per child; never leave a card outside the root.",
  ],
  mode: "standalone",
});

function sourcesFromSearches() {
  const searchCalls = new Set<string>();
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      if (chunk.type === "tool-input-available") {
        if (chunk.toolName === "webSearch") {
          searchCalls.add(chunk.toolCallId);
        }
        return;
      }
      if (
        chunk.type !== "tool-output-available" ||
        !searchCalls.has(chunk.toolCallId) ||
        !isWebSearchOutput(chunk.output)
      ) {
        return;
      }
      for (const source of chunk.output.results) {
        controller.enqueue({
          sourceId: String(source.id),
          title: source.title,
          type: "source-url",
          url: source.url,
        });
      }
    },
  });
}

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const model = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
  const tools = { webSearch: createWebSearch(model) };

  const result = streamText({
    instructions: `${instructions}\n\nToday is ${today} (UTC). Work out relative dates such as "tomorrow" from it.`,
    messages: await convertToModelMessages(messages, {
      convertDataPart: (part) =>
        part.type === "data-spec"
          ? { text: `${JSON.stringify(specPatch(part.data))}\n`, type: "text" }
          : undefined,
      tools,
    }),
    model,
    // The last step must answer: without it a model can keep searching and
    // end the reply with no text.
    prepareStep: ({ stepNumber }) =>
      stepNumber >= SEARCH_STEPS ? { toolChoice: "none" } : {},
    stopWhen: isStepCount(SEARCH_STEPS + 1),
    tools,
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(
          pipeJsonRender(
            toUIMessageStream({ stream: result.stream })
              .pipeThrough(sourcesFromSearches())
              .pipeThrough(stripFencesAndLeadingBlankLines())
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

const TEXT_DELTA = "text-delta";
const FENCE_LINE = /^\s*```[\w-]*\s*$/;

function stripFencesAndLeadingBlankLines() {
  let pendingLine = "";
  let isPossibleFence = false;
  let isStreamingLine = false;
  let hasContent = false;
  let id = "";

  const releasePendingLine = (ending: string) => {
    const isFence = isPossibleFence && FENCE_LINE.test(pendingLine);
    const isLeadingBlank = !(isPossibleFence || hasContent);
    const text = isFence || isLeadingBlank ? "" : pendingLine + ending;
    pendingLine = "";
    isPossibleFence = false;
    if (text) {
      hasContent = true;
    }
    return text;
  };

  const take = (character: string): string => {
    if (character === "\n") {
      const text = isStreamingLine ? "\n" : releasePendingLine("\n");
      isStreamingLine = false;
      return text;
    }
    if (isStreamingLine) {
      return character;
    }
    pendingLine += character;
    if (isPossibleFence || /\s/u.test(character)) {
      return "";
    }
    if (character === "`") {
      isPossibleFence = true;
      return "";
    }
    isStreamingLine = true;
    hasContent = true;
    const text = pendingLine;
    pendingLine = "";
    return text;
  };

  const flushPendingLine = (
    controller: TransformStreamDefaultController<UIMessageChunk>
  ) => {
    const text = releasePendingLine("");
    if (text) {
      controller.enqueue({ delta: text, id, type: TEXT_DELTA });
    }
  };

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    flush: flushPendingLine,
    transform(chunk, controller) {
      if (chunk.type === TEXT_DELTA) {
        ({ id } = chunk);
        let text = "";
        for (const character of chunk.delta) {
          text += take(character);
        }
        if (text) {
          controller.enqueue({ delta: text, id, type: TEXT_DELTA });
        }
        return;
      }
      if (chunk.type === "text-end") {
        flushPendingLine(controller);
        isStreamingLine = false;
      }
      controller.enqueue(chunk);
    },
  });
}

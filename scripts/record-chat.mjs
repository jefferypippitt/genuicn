import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchCardResponses } from "./card-responses.mjs";

const [name, prompt] = process.argv.slice(2);
const origin = process.env.CHAT_ORIGIN ?? "http://localhost:3000";
if (!(name && /^[a-z0-9-]+$/.test(name) && prompt)) {
  console.error(
    'Usage: pnpm record <name> "<prompt>"  (name: lowercase, dashes)'
  );
  process.exit(1);
}

const MAX_WAIT_MS = 1500;

const response = await fetch(`${origin}/api/chat`, {
  body: JSON.stringify({
    messages: [
      {
        id: "recorded-user",
        parts: [{ text: prompt, type: "text" }],
        role: "user",
      },
    ],
  }),
  headers: { "Content-Type": "application/json" },
  method: "POST",
}).catch(() => null);

if (!response?.ok || !response.body) {
  console.error(
    `Couldn't reach ${origin}/api/chat (${response?.status ?? "no response"}). Is pnpm dev running?`
  );
  process.exit(1);
}

const chunks = [];
const decoder = new TextDecoder();
let buffer = "";
let last = Date.now();
for await (const bytes of response.body) {
  buffer += decoder.decode(bytes, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    const data = line.startsWith("data: ") ? line.slice(6).trim() : "";
    if (!data || data === "[DONE]") {
      continue;
    }
    const now = Date.now();
    chunks.push({
      chunk: JSON.parse(data),
      wait: Math.min(now - last, MAX_WAIT_MS),
    });
    last = now;
  }
}

const errors = chunks.filter(({ chunk }) => chunk.type === "error");
if (errors.length > 0) {
  console.error(
    "The reply had an error, so nothing was saved:",
    errors[0].chunk
  );
  process.exit(1);
}

const dir = join(process.cwd(), "content", "recordings");
await mkdir(dir, { recursive: true });
const file = join(dir, `${name}.json`);
const recording = { turns: [{ chunks, prompt }], version: 1 };
recording.responsesByUrl = await fetchCardResponses(recording, origin);
await writeFile(file, `${JSON.stringify(recording, null, 2)}\n`);

const text = chunks
  .filter(({ chunk }) => chunk.type === "text-delta")
  .map(({ chunk }) => chunk.delta)
  .join("")
  .trim();
console.log(`Saved content/recordings/${name}.json (${chunks.length} chunks)`);
console.log(`Reply: ${text}`);

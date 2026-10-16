import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchCardResponses } from "./card-responses.mjs";

const origin = process.env.CHAT_ORIGIN ?? "http://localhost:3000";
const dir = join(process.cwd(), "content", "recordings");

const named = process.argv.slice(2);
const names =
  named.length > 0
    ? named
    : (await readdir(dir))
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -".json".length));

for (const name of names) {
  const file = join(dir, `${name}.json`);
  // eslint-disable-next-line no-await-in-loop -- one recording at a time
  const recording = JSON.parse(await readFile(file, "utf8"));
  // eslint-disable-next-line no-await-in-loop -- one recording at a time
  recording.responsesByUrl = await fetchCardResponses(recording, origin);
  // eslint-disable-next-line no-await-in-loop -- one recording at a time
  await writeFile(file, `${JSON.stringify(recording, null, 2)}\n`);
  console.log(
    `Saved ${Object.keys(recording.responsesByUrl).length} card responses into content/recordings/${name}.json`
  );
}

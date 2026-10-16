import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRelease } from "@/lib/changelog/parse";
import type { Release } from "@/lib/changelog/parse";

const CHANGELOG_DIR = join(process.cwd(), "content", "changelog");
const FILE = /^(\d{4}-\d{2})\.md$/;

export function loadReleases(): Release[] {
  return readdirSync(CHANGELOG_DIR)
    .filter((name) => FILE.test(name))
    .toSorted()
    .toReversed()
    .map((name) => {
      const file = `content/changelog/${name}`;
      const release = parseRelease(
        readFileSync(join(CHANGELOG_DIR, name), "utf8"),
        file
      );
      if (release.month !== FILE.exec(name)?.[1]) {
        throw new Error(`${file}: \`month\` does not match the file name`);
      }
      return release;
    });
}

export function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

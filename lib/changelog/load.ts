import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRelease } from "@/lib/changelog/parse";
import type { Release } from "@/lib/changelog/parse";

const CHANGELOG_DIR = join(process.cwd(), "content", "changelog");
const FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

/**
Every release, newest first. Each file is named after its release day.
*/
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
      if (release.released !== FILE.exec(name)?.[1]) {
        throw new Error(`${file}: \`released\` does not match the file name`);
      }
      return release;
    });
}

/**
The pages the latest release lists under New, e.g. ["/docs/crypto"]. The sidebar marks these with a dot.
*/
export function latestNewHrefs(): string[] {
  const [latest] = loadReleases();
  const group = latest?.groups.find((entry) => entry.kind === "new");
  return group?.entries.flatMap((entry) => entry.href ?? []) ?? [];
}

/**
"2026-10-16" reads "October 16, 2026".
*/
export function releaseLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

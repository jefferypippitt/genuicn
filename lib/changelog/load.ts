import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRelease } from "@/lib/changelog/parse";
import type { Release } from "@/lib/changelog/parse";

const CHANGELOG_DIR = join(process.cwd(), "content", "changelog");
const FILE = /^(\d{4}-\d{2})\.md$/;

/**
Every release, newest first. Each file is named after its release month.
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
      if (release.month !== FILE.exec(name)?.[1]) {
        throw new Error(`${file}: \`month\` does not match the file name`);
      }
      return release;
    })
    .map((release, index) => {
      if (index > 0 && release.cards.some((card) => card.isNew)) {
        throw new Error(
          `content/changelog/${release.month}.md: only the newest month lists \`new\` cards`
        );
      }
      return release;
    });
}

/**
The cards the newest month lists under `new`, e.g. ["/docs/area-chart"]. The sidebar marks these with a dot.
*/
export function latestNewHrefs(): string[] {
  const [latest] = loadReleases();
  return (
    latest?.cards.filter((card) => card.isNew).map((card) => card.href) ?? []
  );
}

/**
"2026-10" reads "October 2026".
*/
export function releaseLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

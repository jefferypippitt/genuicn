import { describe, expect, it } from "vitest";
import {
  latestNewHrefs,
  loadReleases,
  releaseLabel,
} from "@/lib/changelog/load";
import { ChangelogFormatError, parseRelease } from "@/lib/changelog/parse";

const FRONT = "---\nmonth: 2026-10\n---\n";

function release(body: string, front = FRONT) {
  return parseRelease(`${front}\n${body}`, "test.md");
}

function failure(body: string, front = FRONT) {
  try {
    release(body, front);
  } catch (error) {
    expect(error).toBeInstanceOf(ChangelogFormatError);

    return (error as Error).message;
  }
  throw new Error("expected the release to be rejected");
}

describe(parseRelease, () => {
  it("parses the month and each card", () => {
    const parsed = release(
      [
        "- [Quote](/docs/quote): A live `quote` card.",
        "- [Weather](/docs/weather): The next six hours.",
      ].join("\n")
    );

    expect(parsed.month).toBe("2026-10");
    expect(parsed.cards).toStrictEqual([
      {
        href: "/docs/quote",
        isNew: false,
        name: "Quote",
        text: [
          { type: "text", value: "A live " },
          { type: "code", value: "quote" },
          { type: "text", value: " card." },
        ],
      },
      {
        href: "/docs/weather",
        isNew: false,
        name: "Weather",
        text: [{ type: "text", value: "The next six hours." }],
      },
    ]);
  });

  it.each(["2026-13", "2026-10-16"])("rejects month: %s", (month) => {
    expect(failure("- [A](/a): B.", `---\nmonth: ${month}\n---\n`)).toContain(
      "`month` must be YYYY-MM"
    );
  });

  it("marks the cards listed under new", () => {
    const parsed = release(
      "- [Quote](/docs/quote): A.\n- [Weather](/docs/weather): B.",
      "---\nmonth: 2026-10\nnew: /docs/weather\n---\n"
    );

    expect(parsed.cards.map((card) => card.isNew)).toStrictEqual([false, true]);
  });

  it("rejects a new route that no card links to", () => {
    expect(
      failure("- [A](/a): B.", "---\nmonth: 2026-10\nnew: /b\n---\n")
    ).toContain("which no card in this month links to");
  });

  it.each([
    ["a heading", "## New\n\n- [A](/a): B.", "one `-` bullet list"],
    ["a numbered list", "1. [A](/a): B.", "one `-` bullet list"],
    ["text after the list", "- [A](/a): B.\n\nMore.", "nothing goes after"],
    ["a label with no link", "- **A**: B.", "starts with `[Card]"],
    ["an off-site link", "- [A](//evil.com): B.", "use a site route"],
    ["a missing period", "- [A](/a): B", "ends with a period"],
    ["a lowercase sentence", "- [A](/a): b.", "starts with a capital"],
  ])("rejects %s", (_, body, message) => {
    expect(failure(body)).toContain(message);
  });

  it("names the file and line in the error", () => {
    expect(failure("- [A](/a): b.")).toMatch(/^test\.md:5: /u);
  });
});

describe("content/changelog", () => {
  it("every month file parses and matches its file name", () => {
    expect(loadReleases().length).toBeGreaterThan(0);
  });
});

describe(latestNewHrefs, () => {
  it("lists only the newest month's new cards", () => {
    const [latest] = loadReleases();

    expect(latestNewHrefs()).toStrictEqual(
      latest.cards.filter((card) => card.isNew).map((card) => card.href)
    );
  });
});

describe(releaseLabel, () => {
  it("formats a release month in UTC", () => {
    expect(releaseLabel("2026-01")).toBe("January 2026");
  });
});

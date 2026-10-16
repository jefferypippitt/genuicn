import { describe, expect, it } from "vitest";
import {
  latestNewHrefs,
  loadReleases,
  releaseLabel,
} from "@/lib/changelog/load";
import { ChangelogFormatError, parseRelease } from "@/lib/changelog/parse";

const FRONT = "---\nreleased: 2026-10-16\ntitle: Cards ship\n---\n";

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
  it("parses the intro, sections, labels, and refs", () => {
    const parsed = release(
      [
        "The first cards.",
        "",
        "## New",
        "",
        "- [Quote](/docs/quote): A live `quote` card. (#12, abc1234)",
        "",
        "## Breaking",
        "",
        "- **Weather**: The `city` prop is required.",
        "",
        "  ```diff",
        "  -<Weather />",
        '  +<Weather city="London" />',
        "  ```",
      ].join("\n")
    );

    expect(parsed).toMatchObject({
      intro: [{ type: "text", value: "The first cards." }],
      month: "2026-10",
      released: "2026-10-16",
      title: "Cards ship",
    });
    expect(parsed.groups.map((group) => group.kind)).toStrictEqual([
      "new",
      "breaking",
    ]);
    expect(parsed.groups[0].entries[0]).toStrictEqual({
      diff: null,
      href: "/docs/quote",
      kind: "new",
      name: "Quote",
      refs: [
        { number: 12, type: "pr" },
        { sha: "abc1234", type: "commit" },
      ],
      text: [
        { type: "text", value: "A live " },
        { type: "code", value: "quote" },
        { type: "text", value: " card." },
      ],
    });
    expect(parsed.groups[1].entries[0]).toMatchObject({
      diff: '-<Weather />\n+<Weather city="London" />',
      href: null,
      name: "Weather",
    });
  });

  it.each(["2026-02-31", "2026-10"])("rejects released: %s", (day) => {
    const front = `---\nreleased: ${day}\ntitle: Cards ship\n---\n`;

    expect(failure("## New\n\n- **A**: B.", front)).toContain(
      "must be a real YYYY-MM-DD day"
    );
  });

  it("rejects a release with no released day", () => {
    expect(
      failure("## New\n\n- **A**: B.", "---\ntitle: Cards ship\n---\n")
    ).toContain("must be a real YYYY-MM-DD day");
  });

  it.each([
    [
      "sections out of order",
      "## Updated\n\n- **A**: B.\n\n## New\n\n- **A**: B.",
      "sections run New, Breaking, Updated",
    ],
    [
      "an empty section",
      "## New\n\n## Updated\n\n- **A**: B.",
      "previous section has no entries",
    ],
    [
      "an off-site label link",
      "## New\n\n- [A](//evil.com): B.",
      "use a site route",
    ],
    ["a missing period", "## New\n\n- **A**: B", "ends with a period"],
    ["a lowercase sentence", "## New\n\n- **A**: b.", "starts with a capital"],
    [
      "a Breaking entry without a diff",
      "## Breaking\n\n- **A**: B.",
      "needs a ```diff block",
    ],
    ["a bad ref", "## New\n\n- **A**: B. (#x)", "is not a PR"],
  ])("rejects %s", (_, body, message) => {
    expect(failure(body)).toContain(message);
  });

  it("names the file and line in the error", () => {
    expect(failure("## New\n\n- **A**: b.")).toMatch(/^test\.md:8: /u);
  });
});

describe("content/changelog", () => {
  it("every release file parses and matches its file name", () => {
    expect(loadReleases().length).toBeGreaterThan(0);
  });
});

describe(latestNewHrefs, () => {
  it("lists the newest release's New pages and nothing older", () => {
    const [latest] = loadReleases();
    const expected =
      latest.groups
        .find((group) => group.kind === "new")
        ?.entries.flatMap((entry) => entry.href ?? []) ?? [];

    expect(latestNewHrefs()).toStrictEqual(expected);
  });
});

describe(releaseLabel, () => {
  it("formats a release day in UTC", () => {
    expect(releaseLabel("2026-01-05")).toBe("January 5, 2026");
  });
});

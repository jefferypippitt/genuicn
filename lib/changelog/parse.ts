import { fromMarkdown } from "mdast-util-from-markdown";
import type {
  Code,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";

// Adapted from Fluid Functionalism's lib/changelog/parse.ts (MIT).

export const CHANGE_KINDS = ["new", "breaking", "updated"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const KIND_LABEL: Record<ChangeKind, string> = {
  breaking: "Breaking",
  new: "New",
  updated: "Updated",
};

export type Inline =
  { type: "text"; value: string } | { type: "code"; value: string };

export type ChangeRef =
  { type: "pr"; number: number } | { type: "commit"; sha: string };

export interface ChangeEntry {
  kind: ChangeKind;
  name: string;
  href: string | null;
  text: Inline[];
  refs: ChangeRef[];
  diff: string | null;
}

export interface ChangeGroup {
  kind: ChangeKind;
  entries: ChangeEntry[];
}

export interface Release {
  month: string;
  released: string | null;
  title: string;
  intro: Inline[] | null;
  groups: ChangeGroup[];
}

export class ChangelogFormatError extends Error {
  constructor(file: string, line: number | undefined, message: string) {
    super(`${file}${line ? `:${line}` : ""}: ${message}`);
    this.name = "ChangelogFormatError";
  }
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const REF = /^(#\d+|[0-9a-f]{7,12})$/;
const REFS_TAIL = /\s*\(([^()]+)\)$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const HEADINGS: Record<string, ChangeKind> = {
  Breaking: "breaking",
  New: "new",
  Updated: "updated",
};

type Fail = (line: number | undefined, message: string) => never;
type LineOf = (
  node: RootContent | PhrasingContent | ListItem
) => number | undefined;

export function parseRelease(source: string, file = "release.md"): Release {
  const fail: Fail = (line, message) => {
    throw new ChangelogFormatError(file, line, message);
  };

  const front = FRONTMATTER.exec(source);
  if (!front) {
    fail(1, "missing the --- frontmatter block");
  }
  const meta: Record<string, string> = {};
  for (const [index, raw] of front![1].split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const match = /^([a-z]+):\s*(.+)$/.exec(line);
    if (!match) {
      fail(index + 2, `frontmatter line is not \`key: value\`: ${line}`);
    }
    const [, key, value] = match!;
    if (!["month", "released", "title"].includes(key)) {
      fail(index + 2, `unknown frontmatter key \`${key}\``);
    }
    meta[key] = value.trim();
  }

  const { month, released, title } = meta;
  if (!month || !MONTH.test(month)) {
    fail(2, "`month` must be YYYY-MM");
  }
  if (!title) {
    fail(2, "`title` is required");
  }
  if (title.length > 90) {
    fail(2, "`title` runs past 90 characters");
  }
  if (title.endsWith(".")) {
    fail(2, "`title` ends with a period");
  }
  if (released !== undefined) {
    // The pattern lets 2026-02-31 through; Date would roll it into March.
    if (
      !DAY.test(released) ||
      new Date(`${released}T00:00:00Z`).toISOString().slice(0, 10) !== released
    ) {
      fail(2, "`released` must be a real YYYY-MM-DD day");
    }
    if (released < `${month}-01`) {
      fail(2, "`released` falls before the month started");
    }
  }

  const offset = front![0].split("\n").length - 1;
  const tree = fromMarkdown(source.slice(front![0].length));
  const lineOf: LineOf = (node) =>
    node.position ? node.position.start.line + offset : undefined;

  let intro: Inline[] | null = null;
  const groups: ChangeGroup[] = [];
  let current: ChangeGroup | null = null;
  let isExpectList = false;

  for (const node of tree.children) {
    if (node.type === "heading") {
      if (node.depth !== 2) {
        fail(lineOf(node), "only `##` headings are allowed");
      }
      const [only] = node.children;
      const label =
        node.children.length === 1 && only.type === "text" ? only.value : "";
      const kind = HEADINGS[label];
      if (!kind) {
        fail(
          lineOf(node),
          `unknown section \`${label}\`; use New, Breaking, or Updated`
        );
      }
      const last = groups.at(-1);
      if (
        last &&
        CHANGE_KINDS.indexOf(kind) <= CHANGE_KINDS.indexOf(last.kind)
      ) {
        fail(lineOf(node), "sections run New, Breaking, Updated, each once");
      }
      if (isExpectList) {
        fail(lineOf(node), "the previous section has no entries");
      }
      current = { kind, entries: [] };
      groups.push(current);
      isExpectList = true;
      continue;
    }
    if (!current) {
      if (node.type === "paragraph" && intro === null) {
        intro = parseInline(node.children, fail, lineOf(node));
        continue;
      }
      fail(
        lineOf(node),
        "only one intro paragraph may sit above the first section"
      );
    }
    if (node.type !== "list" || !isExpectList) {
      fail(
        lineOf(node),
        "a section holds exactly one bullet list and nothing else"
      );
    }
    if ((node as List).ordered) {
      fail(lineOf(node), "use `-` bullets, not a numbered list");
    }
    for (const item of (node as List).children) {
      current!.entries.push(parseEntry(item, current!.kind, fail, lineOf));
    }
    isExpectList = false;
  }

  if (isExpectList) {
    fail(undefined, "the last section has no entries");
  }
  if (groups.length === 0) {
    fail(undefined, "a release needs at least one section");
  }

  return { month, released: released ?? null, title, intro, groups };
}

function parseEntry(
  item: ListItem,
  kind: ChangeKind,
  fail: Fail,
  lineOf: LineOf
): ChangeEntry {
  const line = lineOf(item);
  const [first, ...rest] = item.children;
  if (!first || first.type !== "paragraph") {
    fail(line, "an entry starts with its label and sentence");
  }
  const paragraph = first as Paragraph;

  let diff: string | null = null;
  for (const extra of rest) {
    if (extra.type !== "code") {
      fail(
        lineOf(extra),
        "an entry holds one line, plus a diff block when Breaking"
      );
    }
    const code = extra as Code;
    if (kind !== "breaking") {
      fail(lineOf(extra), "only Breaking entries carry a code block");
    }
    if (code.lang !== "diff") {
      fail(lineOf(extra), "the migration block must be fenced as ```diff");
    }
    if (diff !== null) {
      fail(lineOf(extra), "a Breaking entry carries exactly one diff block");
    }
    diff = code.value;
  }
  if (kind === "breaking" && diff === null) {
    fail(line, "a Breaking entry needs a ```diff block");
  }

  const [label, ...sentence] = paragraph.children;
  let name = "";
  let href: string | null = null;
  if (label?.type === "link") {
    name = plainText(label.children);
    href = label.url;
    // A site route: one leading slash. `//host` and `/\host` leave the site.
    if (!/^\/(?![/\\])/.test(href)) {
      fail(line, `label links to \`${href}\`; use a site route`);
    }
  } else if (label?.type === "strong") {
    name = plainText(label.children);
  } else {
    fail(line, "an entry starts with `[Name](/docs/slug)` or `**Name**`");
  }
  if (!name) {
    fail(line, "the label is empty");
  }

  const text = parseInline(sentence, fail, line);
  const head = text[0];
  if (!head || head.type !== "text" || !head.value.startsWith(": ")) {
    fail(line, "a colon and a space follow the label");
  }
  head.value = head.value.slice(2);
  if (!head.value) {
    text.shift();
  }

  let references: ChangeRef[] = [];
  const tail = text.at(-1);
  const referencesMatch =
    tail?.type === "text" ? REFS_TAIL.exec(tail.value) : null;
  if (tail && referencesMatch) {
    references = referencesMatch[1].split(",").map((raw) => {
      const reference = raw.trim();
      if (!REF.test(reference)) {
        fail(line, `\`${reference}\` is not a PR (#52) or a 7-character SHA`);
      }
      return reference.startsWith("#")
        ? ({ type: "pr", number: Number(reference.slice(1)) } as const)
        : ({ type: "commit", sha: reference } as const);
    });
    if (references.length > 3) {
      fail(line, "3 refs at most");
    }
    tail.value = tail.value.slice(0, referencesMatch.index);
    if (!tail.value) {
      text.pop();
    }
  }

  const last = text.at(-1);
  if (!last || last.type !== "text" || !/[.!?]$/.test(last.value)) {
    fail(line, "the sentence ends with a period");
  }
  const [lead] = text;
  if (lead.type === "text" && !/^[A-Z0-9]/.test(lead.value)) {
    fail(line, "the sentence starts with a capital");
  }

  return { kind, name, href, text, refs: references, diff };
}

function plainText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if ("value" in n) {
        return n.value;
      }
      return "children" in n ? plainText(n.children) : "";
    })
    .join("");
}

function parseInline(
  nodes: PhrasingContent[],
  fail: Fail,
  line: number | undefined
): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const value = node.value.replaceAll(/\s+/g, " ");
      const previous = out.at(-1);
      if (previous?.type === "text") {
        previous.value += value;
      } else {
        out.push({ type: "text", value });
      }
    } else if (node.type === "inlineCode") {
      out.push({ type: "code", value: node.value });
    } else {
      fail(
        line,
        `only plain text and inline code go in a sentence, found ${node.type}`
      );
    }
  }
  return out;
}

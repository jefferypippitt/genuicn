import { fromMarkdown } from "mdast-util-from-markdown";
import type { ListItem, PhrasingContent, RootContent } from "mdast";

// Adapted from Fluid Functionalism's lib/changelog/parse.ts (MIT).

export type Inline =
  { type: "text"; value: string } | { type: "code"; value: string };

export interface CardEntry {
  name: string;
  href: string;
  text: Inline[];
  /**
  Listed in the frontmatter's `new` line. The sidebar and the changelog give these the blue dot.
  */
  isNew: boolean;
}

export interface Release {
  /**
  The release month as YYYY-MM. It names the file and the page anchor.
  */
  month: string;
  cards: CardEntry[];
}

export class ChangelogFormatError extends Error {
  constructor(file: string, line: number | undefined, message: string) {
    super(`${file}${line ? `:${line}` : ""}: ${message}`);
    this.name = "ChangelogFormatError";
  }
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const META_LINE = /^([a-z]+):\s*(.+)$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
// A site route: one leading slash. `//host` and `/\host` leave the site.
const SITE_ROUTE = /^\/(?![/\\])/;

type Fail = (line: number | undefined, message: string) => never;

export function parseRelease(source: string, file = "release.md"): Release {
  const fail: Fail = (line, message) => {
    throw new ChangelogFormatError(file, line, message);
  };

  const front = FRONTMATTER.exec(source);
  if (!front) {
    fail(1, "missing the --- frontmatter block");
  }
  const meta = new Map<string, string>();
  for (const [index, raw] of front![1].split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const match = META_LINE.exec(line);
    if (!match || !["month", "new"].includes(match[1])) {
      fail(index + 2, "the frontmatter holds `month` and an optional `new`");
    }
    meta.set(match[1], match[2].trim());
  }
  const month = meta.get("month");
  if (!month || !MONTH.test(month)) {
    fail(2, "`month` must be YYYY-MM");
  }
  const newHrefs = new Set(
    meta
      .get("new")
      ?.split(",")
      .map((href) => href.trim())
  );

  const offset = front![0].split("\n").length - 1;
  const lineOf = (node: RootContent | ListItem) =>
    node.position ? node.position.start.line + offset : undefined;

  const [list, ...rest] = fromMarkdown(source.slice(front![0].length)).children;
  if (!list || list.type !== "list" || list.ordered) {
    fail(list ? lineOf(list) : undefined, "a release is one `-` bullet list");
  }
  if (rest.length > 0) {
    fail(lineOf(rest[0]), "nothing goes after the bullet list");
  }

  const cards = list.children.map((item) => {
    const card = parseCard(item, fail, lineOf(item));
    return { ...card, isNew: newHrefs.has(card.href) };
  });
  for (const href of newHrefs) {
    if (cards.every((card) => card.href !== href)) {
      fail(
        2,
        `\`new\` lists \`${href}\`, which no card in this month links to`
      );
    }
  }

  return { cards, month };
}

function parseCard(
  item: ListItem,
  fail: Fail,
  line: number | undefined
): Omit<CardEntry, "isNew"> {
  const [paragraph, ...rest] = item.children;
  if (!paragraph || paragraph.type !== "paragraph" || rest.length > 0) {
    fail(line, "an entry is one line");
  }

  const [label, ...sentence] = paragraph.children;
  if (label?.type !== "link") {
    fail(line, "an entry starts with `[Card](/docs/slug)`");
  }
  const name = plainText(label.children);
  const href = label.url;
  if (!name) {
    fail(line, "the card name is empty");
  }
  if (!SITE_ROUTE.test(href)) {
    fail(line, `the card links to \`${href}\`; use a site route`);
  }

  const text = parseInline(sentence, fail, line);
  const [head] = text;
  if (head?.type !== "text" || !head.value.startsWith(": ")) {
    fail(line, "a colon and a space follow the card name");
  }
  head.value = head.value.slice(2);
  if (!head.value) {
    text.shift();
  }

  const [lead] = text;
  const last = text.at(-1);
  if (!last || last.type !== "text" || !last.value.endsWith(".")) {
    fail(line, "the sentence ends with a period");
  }
  if (lead.type === "text" && !/^[A-Z0-9]/.test(lead.value)) {
    fail(line, "the sentence starts with a capital");
  }

  return { href, name, text };
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

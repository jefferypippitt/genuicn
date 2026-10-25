import type { BundledLanguage, Highlighter } from "shiki";

const THEMES = { dark: "github-dark", light: "github-light" } as const;

export interface CodeToken {
  readonly text: string;
  readonly light?: string;
  readonly dark?: string;
}

export type CodeLine = readonly CodeToken[];

/**
Shiki itself loads on the first code block, not with the page.
*/
async function loadShiki() {
  // eslint-disable-next-line import-x/dynamic-import-chunkname -- Turbopack names its own chunks; a webpack magic comment would do nothing
  return await import("shiki");
}

async function createCardHighlighter() {
  const { createHighlighter } = await loadShiki();
  return await createHighlighter({
    langs: [],
    themes: [THEMES.light, THEMES.dark],
  });
}

const shared: { highlighter?: Promise<Highlighter> } = {};

/**
One highlighter for the page, made on first use. Shiki loads each language's grammar only when a block asks for it, so a page of TypeScript never downloads Rust.
*/
function getHighlighter() {
  shared.highlighter ??= createCardHighlighter();
  return shared.highlighter;
}

/**
The code as lines of colored tokens, a light and a dark color each. Null when Shiki has no grammar for the language, so the card shows the code plain.
*/
export async function highlightCode(
  code: string,
  language: string
): Promise<CodeLine[] | null> {
  const { bundledLanguages } = await loadShiki();
  if (!Object.hasOwn(bundledLanguages, language)) {
    return null;
  }
  const lang = language as BundledLanguage;
  const highlighter = await getHighlighter();
  await highlighter.loadLanguage(lang);
  return highlighter
    .codeToTokensWithThemes(code, { lang, themes: THEMES })
    .map((line) =>
      line.map((token) => ({
        dark: token.variants.dark?.color,
        light: token.variants.light?.color,
        text: token.content,
      }))
    );
}

import type { Highlighter } from "shiki/bundle/web";

const themes = { dark: "github-dark", light: "github-light" } as const;

export interface HighlightToken {
  readonly offset: number;
  readonly text: string;
  readonly light?: string;
  readonly dark?: string;
}

export interface HighlightLine {
  readonly offset: number;
  readonly tokens: readonly HighlightToken[];
}

export interface HighlightedCode {
  readonly foreground: { readonly light?: string; readonly dark?: string };
  readonly lines: readonly HighlightLine[];
}

let loading: Promise<Highlighter> | null = null;

function getHighlighter() {
  loading ??= import("shiki/bundle/web").then(({ createHighlighter }) =>
    createHighlighter({
      langs: ["tsx", "ts"],
      themes: [themes.dark, themes.light],
    })
  );
  return loading;
}

export async function highlight(code: string): Promise<HighlightedCode> {
  if (!code) {
    return { foreground: {}, lines: [] };
  }
  const highlighter = await getHighlighter();
  const tokenLines = highlighter.codeToTokensWithThemes(code.trim(), {
    lang: "tsx",
    themes,
  });
  function toToken(token: (typeof tokenLines)[number][number]): HighlightToken {
    return {
      dark: token.variants.dark?.color,
      light: token.variants.light?.color,
      offset: token.offset,
      text: token.content,
    };
  }
  const lines: HighlightLine[] = [];
  let cursor = 0;
  for (const line of tokenLines) {
    const offset = line[0]?.offset ?? cursor;
    const tokens = line.map(toToken);
    const last = line.at(-1);
    cursor = (last ? last.offset + last.content.length : offset) + 1;
    lines.push({ offset, tokens });
  }
  return {
    foreground: {
      dark: highlighter.getTheme(themes.dark).fg,
      light: highlighter.getTheme(themes.light).fg,
    },
    lines,
  };
}

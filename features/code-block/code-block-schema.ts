/**
How a language shows in the header: its name, and the dot GitHub's linguist colors it with, so a file reads at a glance the way it does on GitHub.
*/
interface LanguageLook {
  readonly label: string;
  readonly color: string;
}

const LOOKS: Record<string, LanguageLook> = {
  bash: { color: "#89e051", label: "Bash" },
  c: { color: "#555555", label: "C" },
  cpp: { color: "#f34b7d", label: "C++" },
  csharp: { color: "#178600", label: "C#" },
  css: { color: "#663399", label: "CSS" },
  diff: { color: "#8b949e", label: "Diff" },
  dockerfile: { color: "#384d54", label: "Dockerfile" },
  go: { color: "#00add8", label: "Go" },
  graphql: { color: "#e10098", label: "GraphQL" },
  html: { color: "#e34c26", label: "HTML" },
  java: { color: "#b07219", label: "Java" },
  javascript: { color: "#f1e05a", label: "JavaScript" },
  json: { color: "#8b949e", label: "JSON" },
  jsx: { color: "#f1e05a", label: "JSX" },
  kotlin: { color: "#a97bff", label: "Kotlin" },
  markdown: { color: "#083fa1", label: "Markdown" },
  php: { color: "#4f5d95", label: "PHP" },
  powershell: { color: "#012456", label: "PowerShell" },
  python: { color: "#3572a5", label: "Python" },
  ruby: { color: "#701516", label: "Ruby" },
  rust: { color: "#dea584", label: "Rust" },
  sql: { color: "#e38c00", label: "SQL" },
  svelte: { color: "#ff3e00", label: "Svelte" },
  swift: { color: "#f05138", label: "Swift" },
  text: { color: "#8b949e", label: "Text" },
  toml: { color: "#9c4221", label: "TOML" },
  tsx: { color: "#3178c6", label: "TSX" },
  typescript: { color: "#3178c6", label: "TypeScript" },
  vue: { color: "#41b883", label: "Vue" },
  yaml: { color: "#cb171e", label: "YAML" },
};

/**
What people and models write for a language, mapped to the name above.
*/
const ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cpp",
  cs: "csharp",
  docker: "dockerfile",
  golang: "go",
  js: "javascript",
  md: "markdown",
  plaintext: "text",
  ps1: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  txt: "text",
  yml: "yaml",
  zsh: "bash",
};

/**
A language name the card knows, or the lower-cased input when it doesn't (the highlighter may still know it).
*/
export function normalizeLanguage(language: string | null | undefined): string {
  const key = typeof language === "string" ? language.trim().toLowerCase() : "";
  return ALIASES[key] ?? (key || "text");
}

export function languageLook(language: string): LanguageLook {
  return LOOKS[language] ?? { color: "#8b949e", label: language };
}

/**
Line numbers to call out, kept to lines that exist, in order, without repeats.
*/
export function calloutLines(
  lines: readonly number[] | null | undefined,
  lineCount: number
): ReadonlySet<number> {
  return new Set(
    (lines ?? []).filter(
      (line) => Number.isSafeInteger(line) && line >= 1 && line <= lineCount
    )
  );
}

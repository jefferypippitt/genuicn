export const TERMINAL_SHELLS = ["bash", "zsh", "fish", "powershell"] as const;
export type TerminalShell = (typeof TERMINAL_SHELLS)[number];

export interface TerminalStep {
  readonly command?: string;
  /**
  What the command prints, when the model shows it.
  */
  readonly output?: string | null;
}

/**
How each shell marks a line you type: the prompt's glyph, after the working directory.
*/
export const PROMPT_GLYPH: Record<TerminalShell, string> = {
  bash: "$",
  fish: ">",
  powershell: ">",
  zsh: "❯",
};

export type OutputTone = "error" | "warning" | "success" | "plain";

const ERROR_LINE =
  /(?:^\s*(?:error|err!|fatal|failed|×|✗|✖))|(?:\berror\b[:[])/iu;
const WARNING_LINE = /^\s*(?:warn(?:ing)?|⚠)/iu;
const SUCCESS_LINE = /^\s*(?:✓|✔|done|success|ready|added \d)/iu;

/**
Colors an output line the way a terminal's tools usually do: errors red, warnings amber, finished steps green.
*/
export function outputTone(line: string): OutputTone {
  if (ERROR_LINE.test(line)) {
    return "error";
  }
  if (WARNING_LINE.test(line)) {
    return "warning";
  }
  return SUCCESS_LINE.test(line) ? "success" : "plain";
}

/**
The shell's name in the header, the way the code block names its language.
*/
export const SHELL_LABEL: Record<TerminalShell, string> = {
  bash: "Bash",
  fish: "fish",
  powershell: "PowerShell",
  zsh: "zsh",
};

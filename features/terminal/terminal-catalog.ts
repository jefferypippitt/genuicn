import { z } from "zod";
import { TERMINAL_SHELLS } from "@/features/terminal/terminal-schema";

export const terminalCatalogEntry = {
  description:
    "A terminal window: shell commands for the user to run, in order, each with its own copy button, and optionally what a command prints. Use it whenever the reply asks the user to run something: installing packages, setting up or starting a project, git steps, Docker, deploying, checking a version. Put each command in its own step, in the order they run. Code that goes in a file belongs in the Code block card, not here.",
  props: z.object({
    cwd: z
      .string()
      .nullable()
      .describe(
        "The working directory shown in the prompt, like ~/my-app. Null for the home directory."
      ),
    shell: z
      .enum(TERMINAL_SHELLS)
      .nullable()
      .describe(
        "The user's shell. powershell when they're on Windows, otherwise null (zsh)."
      ),
    steps: z
      .array(
        z.object({
          command: z.string().describe("One command, exactly as typed."),
          output: z
            .string()
            .nullable()
            .describe(
              "What the command prints, only when the user needs it to check the result, like a version number or a ready message. Keep it short. Null otherwise."
            ),
        })
      )
      .describe("The commands, in the order to run them."),
  }),
};

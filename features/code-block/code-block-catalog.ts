import { z } from "zod";

export const codeBlockCatalogEntry = {
  description:
    "A code block: code you wrote for the user, highlighted for its language, with the file name, line numbers and a copy button. Use it whenever the reply includes code the user will read, paste or save: a function, a component, a config file, a query, a script. One block per file. Keep commands to run in a shell out of it (use the Terminal card for those). Explain the code in your sentence, not in long comments.",
  props: z.object({
    code: z
      .string()
      .describe(
        "The code itself, complete and ready to paste, with its own indentation and no Markdown fences."
      ),
    filename: z
      .string()
      .nullable()
      .describe(
        "The file the code belongs in, like app/page.tsx or docker-compose.yml. Null for a snippet that isn't a whole file."
      ),
    highlight: z
      .array(z.number())
      .nullable()
      .describe(
        "Line numbers (from 1) to call out, like the lines that changed or the ones the user asked about. Null for none."
      ),
    language: z
      .string()
      .describe(
        "The language for highlighting, like tsx, python, go, sql, yaml or json."
      ),
  }),
};

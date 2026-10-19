import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
import next from "ultracite/eslint/next";
import vitest from "ultracite/eslint/vitest";

const reactPlugin = react.find((config) => config.plugins?.react)?.plugins
  .react;

// *.spec.ts files are Playwright tests, not Vitest.
const vitestTests = vitest.map((config) => ({
  ...config,
  files: ["**/*.test.{ts,tsx}"],
}));

export default [
  {
    ignores: [
      ".agents/**",
      ".claude/**",
      "components/ui/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...core,
  ...react,
  ...next,
  ...vitestTests,
  {
    plugins: { react: reactPlugin },
    rules: {
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      // Contradicts arrow-body-style: a multiline single-expression arrow
      // fails one rule with an implicit return and the other with an
      // explicit one. Prettier-formatted callbacks use the implicit form.
      "unicorn/consistent-arrow-return-style": "off",
      "react/function-component-definition": [
        "error",
        { namedComponents: ["function-declaration", "arrow-function"] },
      ],
    },
  },
  {
    // json-render types each registry callback's props from the catalog's
    // zod schemas, so TypeScript already checks them; prop-types can't see that.
    files: ["**/chat-registry.tsx"],
    rules: { "react/prop-types": "off" },
  },
];

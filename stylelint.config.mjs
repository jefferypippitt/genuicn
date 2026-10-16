import config from "ultracite/stylelint";

export default {
  ...config,
  rules: {
    ...config.rules,
    "selector-class-pattern": [
      "^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|tableWrapper)$",
      { message: "Expected class selector to be kebab-case" },
    ],
  },
};

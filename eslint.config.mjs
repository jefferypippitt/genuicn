import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
import next from "ultracite/eslint/next";
import vitest from "ultracite/eslint/vitest";

export default [...core, ...react, ...next, ...vitest];

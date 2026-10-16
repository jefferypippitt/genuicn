"use client";

import dynamic from "next/dynamic";

// json-render's devtools panel, in development only. Behind a dynamic import
// on NODE_ENV, so production builds don't ship its code at all (on its own
// it renders null in production but still lands in the bundle).
export const ChatDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@json-render/devtools-react").then(
            (module) => module.JsonRenderDevtools
          ),
        { ssr: false }
      )
    : () => null;

import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

import ignorePatterns from "./oxignore.json" with { type: "json" };

export default defineConfig({
    env: core.env,
    extends: [core, react, tanstack, vitest, shadcn, antiSlop],
    ignorePatterns: [...(core.ignorePatterns ?? []), ...ignorePatterns],
    jsPlugins: shadcn.jsPlugins,
    rules: {
        "require-await": "off",
        "func-style": "off",
        "anti-slop/no-unsafe-dictionary-type": "off",
        "anti-slop/no-unknown-returns": "off",
        "no-warning-comments": "off",
        "oxc/no-barrel-file": "off",
        "class-methods-use-this": "off",
        "max-classes-per-file": "off",
    },
    overrides: [
        {
            // Shiki writes per-token CSS custom properties (--shiki-light*,
            // --shiki-dark*) into `htmlStyle`; they are chosen at runtime and
            // cannot be expressed as static classes.
            files: ["apps/dashboard/src/lib/highlighter.tsx"],
            rules: {
                "shadcn/no-inline-styles": [
                    "error",
                    { allowDynamicIdentifiers: ["token.htmlStyle"] },
                ],
            },
        },
    ],
});

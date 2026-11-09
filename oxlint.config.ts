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
});

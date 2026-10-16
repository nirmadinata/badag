import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import ignorePatterns from "./oxignore.json" with { type: "json" };

export default defineConfig({
    ...ultracite,
    ignorePatterns,
    tabWidth: 4,
});

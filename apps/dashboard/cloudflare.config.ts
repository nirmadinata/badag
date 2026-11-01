import { defineConfig } from "cf/config";

import * as entrypoint from "./src/server" with { type: "cf-worker" };

export default defineConfig({
    worker: {
        name: "tanstack-start-app",
        compatibilityDate: "2025-09-02",
        compatibilityFlags: ["nodejs_compat"],
        entrypoint,
    },
});

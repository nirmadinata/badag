import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // Mirrors the `@/*` path mapping in tsconfig.json.
            "@": fileURLToPath(new URL("src", import.meta.url)),
        },
    },
    test: {
        include: ["**/*.test.ts"],
        typecheck: {
            enabled: true,
            include: ["**/*.test.ts"],
        },
    },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
    root: import.meta.dirname,
    test: {
        include: ["e2e/**/*.test.ts"],
        globalSetup: ["e2e/global-setup.ts"],
        hookTimeout: 60_000,
        testTimeout: 60_000,
    },
});

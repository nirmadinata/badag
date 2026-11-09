import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        reporters: ["default", "junit"],
        outputFile: {
            junit: "reports/vitest-junit.xml",
        },
        typecheck: {
            enabled: true,
            include: ["**/*.test.ts"],
        },
    },
});

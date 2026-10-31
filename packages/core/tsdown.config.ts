import { fileURLToPath } from "node:url";

import { defineConfig } from "tsdown";

export default defineConfig({
    // Mirrors the `@/*` path mapping in tsconfig.json; tsdown does not read
    // compilerOptions.paths.
    alias: {
        "@": fileURLToPath(new URL("src", import.meta.url)),
    },
    dts: {
        generator: "tsgo",
    },
    exports: true,
    // ...config options
});

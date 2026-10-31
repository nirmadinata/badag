import { defineConfig } from "tsdown";

export default defineConfig({
    // Core is an internal source package, so it is inlined into the SDK
    // bundle instead of being published as a runtime dependency.
    deps: {
        alwaysBundle: ["@badag/core"],
        onlyBundle: ["@standard-schema/spec"],
    },
    dts: {
        generator: "tsgo",
    },
    exports: true,
});

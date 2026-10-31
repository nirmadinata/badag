import { defineConfig } from "tsdown";

export default defineConfig({
    // Core is an internal source package, so it is inlined into the SDK
    // bundle instead of being published as a runtime dependency.
    deps: {
        alwaysBundle: ["@badag/core"],
        onlyBundle: ["@standard-schema/spec"],
    },
    // The tsgo declaration generator reads one tsconfig, so the build config
    // includes core's source alongside the SDK entry point.
    dts: {
        generator: "tsgo",
        tsconfig: "./tsconfig.build.json",
    },
    exports: true,
});

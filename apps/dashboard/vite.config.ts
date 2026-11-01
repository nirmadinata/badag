import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    build: {
        // `@tanstack/start-plugin-core` builds with `builder.sharedPlugins`, so
        // Vite's `vite:css-post` plugin is created once from this top-level
        // config and reads `build.sourcemap` here, not the per-environment
        // value. Only the Worker environment enables sourcemaps (set by
        // `@cloudflare/vite-plugin`), so on a `false` root value css-post drops
        // the map for CSS `?url` chunks and Rolldown logs SOURCEMAP_BROKEN.
        // https://github.com/vitejs/vite/issues/23809 — drop once fixed upstream.
        sourcemap: true,
    },
    environments: {
        // Only the Worker needs sourcemaps (stack traces); static assets don't.
        client: { build: { sourcemap: false } },
    },
    plugins: [
        devtools(),
        cloudflare({ viteEnvironment: { name: "ssr" } }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
    ],
});

export default config;

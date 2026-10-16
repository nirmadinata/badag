import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

import { valibotOnlySchemaVendors } from "./plugins/valibot-only-schema-vendors.ts";

export default defineConfig({
    plugins: [cloudflare(), valibotOnlySchemaVendors()],
    resolve: { tsconfigPaths: true },
});

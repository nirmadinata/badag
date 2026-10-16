import type { Plugin } from "vite";

// hono-openapi converts schemas through @standard-community/standard-json and
// standard-openapi. Both pick the validator adapter with a runtime `switch` over
// dynamic imports, so Rollup must emit every supported vendor even though this
// worker only registers valibot schemas. Replace the unused adapters with a
// stub: the zod branch alone otherwise pulls in ~45 kB of zod core.
const UNUSED_VENDOR_STUB = `export default () => {
    throw new Error("This build only supports valibot schemas; unused schema-vendor adapters were pruned.");
};`;

const UNUSED_VENDOR_MODULE = "\0badag:unused-schema-vendor";

const ADAPTER_SOURCE = /^\.\/(?:arktype|effect|sury|typebox|zod)-[^/\\]+\.js$/u;

const ADAPTER_IMPORTER =
    /[/\\]@standard-community[/\\](?:standard-json|standard-openapi)[/\\]dist[/\\]index-[^/\\]+\.js$/u;

export function valibotOnlySchemaVendors(): Plugin {
    return {
        name: "badag:valibot-only-schema-vendors",
        enforce: "pre",
        resolveId(source, importer) {
            if (
                !importer ||
                !(
                    ADAPTER_SOURCE.test(source) &&
                    ADAPTER_IMPORTER.test(importer)
                )
            ) {
                return null;
            }

            return UNUSED_VENDOR_MODULE;
        },
        load(id) {
            return id === UNUSED_VENDOR_MODULE ? UNUSED_VENDOR_STUB : null;
        },
    };
}

import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

// One schema for both environments: Worker secrets arrive through
// `process.env` (nodejs_compat), client values through Vite's
// `import.meta.env`. Server keys are never validated on the client.
export const appenv = createEnv({
    server: {
        BETTER_AUTH_SECRET: v.pipe(
            v.string(),
            v.minLength(
                32,
                "BETTER_AUTH_SECRET must be at least 32 characters long."
            )
        ),
        BETTER_AUTH_URL: v.pipe(
            v.string(),
            v.url("BETTER_AUTH_URL must be an absolute URL.")
        ),
    },
    clientPrefix: "VITE_",
    client: {},
    runtimeEnv: {
        ...process.env,
        ...import.meta.env,
    },
    emptyStringAsUndefined: true,
});

import { createFileRoute } from "@tanstack/react-router";

import { handlePublicApiRequest } from "@/integrations/hono/app";

// The public API owns everything under `/api/v1`, including the Scalar
// documentation at `/api/v1/docs`.
export const Route = createFileRoute("/api/v1/$")({
    server: {
        handlers: {
            ANY: ({ request }) => handlePublicApiRequest(request),
        },
    },
});

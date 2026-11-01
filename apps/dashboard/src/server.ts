import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

// Custom Start server entrypoint: delegate to the built-in handler while
// leaving room for request/response customization.
export default createServerEntry({
    fetch(request, opts) {
        return handler.fetch(request, opts);
    },
});

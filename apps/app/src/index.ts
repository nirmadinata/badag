import { app } from "@/routes";

export * from "@/exports";

export default {
    fetch(request, env, ctx) {
        return app.fetch(request, env, ctx);
    },
} satisfies ExportedHandler<Env>;

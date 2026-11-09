import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
    HeadContent,
    Link,
    Scripts,
    createRootRouteWithContext,
    redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/toaster";
import { getAuthState } from "@/integrations/better-auth/session";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import { themeInitScript } from "@/lib/theme";

import appCss from "@/styles.css?url";

interface RouterContext {
    queryClient: QueryClient;
}

const RootDocument = ({ children }: { children: React.ReactNode }) => (
    // The theme head script sets `class="dark"` and `style.color-scheme`
    // before hydration. Those attributes are intentionally outside React's
    // control, so attribute-level mismatch suppression is required here.
    <html lang="en" suppressHydrationWarning>
        <head>
            <HeadContent />
        </head>
        <body>
            <Toaster>{children}</Toaster>
            {import.meta.env.DEV ? (
                <TanStackDevtools
                    config={{ position: "bottom-right" }}
                    plugins={[
                        {
                            name: "Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                        TanStackQueryDevtools,
                    ]}
                />
            ) : null}
            <Scripts />
        </body>
    </html>
);

const NotFound = () => (
    <main className="p-8">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
            That page does not exist.
        </p>
        <Link className="mt-6 inline-block text-sm underline" to="/dashboard">
            Back to dashboard
        </Link>
    </main>
);

export const Route = createRootRouteWithContext<RouterContext>()({
    // Until the first account exists, every UI route funnels into setup. Auth
    // API routes are excluded so sign-up itself can run.
    beforeLoad: async ({ location }) => {
        const authState = await getAuthState();

        if (
            authState.setupRequired &&
            location.pathname !== "/auth/setup" &&
            !location.pathname.startsWith("/api/")
        ) {
            throw redirect({ to: "/auth/setup" });
        }

        return { authState };
    },
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            { title: "Badag" },
        ],
        links: [{ rel: "stylesheet", href: appCss }],
        // Applied inside <head> so the stored theme wins before first paint.
        scripts: [{ children: themeInitScript }],
    }),
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
});

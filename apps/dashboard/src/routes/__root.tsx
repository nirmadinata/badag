import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
    HeadContent,
    Link,
    Scripts,
    createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";

import appCss from "@/styles.css?url";

interface RouterContext {
    queryClient: QueryClient;
}

const RootDocument = ({ children }: { children: React.ReactNode }) => (
    <html lang="en">
        <head>
            <HeadContent />
        </head>
        <body>
            {children}
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
    }),
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
});

import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/features/dashboard/components/overview-page";

export const Route = createFileRoute("/dashboard/")({
    head: () => ({
        meta: [
            { title: "Overview · Badag" },
            {
                name: "description",
                content:
                    "Runs, success rate, active DAGs, and graph audit findings.",
            },
        ],
    }),
    component: OverviewPage,
});

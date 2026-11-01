import { createFileRoute } from "@tanstack/react-router";

import { ActivityPage } from "@/features/dashboard/components/activity-page";

export const Route = createFileRoute("/dashboard/activity")({
    head: () => ({
        meta: [
            { title: "Activity · Badag" },
            {
                name: "description",
                content: "Recent team activity.",
            },
        ],
    }),
    component: ActivityPage,
});

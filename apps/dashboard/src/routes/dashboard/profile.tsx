import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/features/auth/components/profile-page";

const ProfileRoutePage = () => {
    const { user } = Route.useRouteContext();

    return <ProfilePage user={user} />;
};

export const Route = createFileRoute("/dashboard/profile")({
    head: () => ({
        meta: [
            { title: "Profile · Badag" },
            {
                name: "description",
                content: "Manage your Badag account details and password.",
            },
        ],
    }),
    component: ProfileRoutePage,
});

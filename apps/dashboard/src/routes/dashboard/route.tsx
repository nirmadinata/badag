import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { CommandMenu } from "@/features/dashboard/components/command-menu";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

const DashboardLayout = () => {
    const { user } = Route.useRouteContext();
    const [commandOpen, setCommandOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                setCommandOpen((value) => !value);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <SidebarProvider>
            <AppSidebar isAdmin={user.role === "admin"} />
            <SidebarInset>
                <DashboardHeader
                    onOpenCommand={() => setCommandOpen(true)}
                    user={user}
                />
                <div className="flex flex-1 flex-col p-4 md:p-6">
                    <Outlet />
                </div>
            </SidebarInset>
            <CommandMenu
                isAdmin={user.role === "admin"}
                onOpenChange={setCommandOpen}
                open={commandOpen}
            />
        </SidebarProvider>
    );
};

export const Route = createFileRoute("/dashboard")({
    beforeLoad: ({ context }) => {
        const { setupRequired, user } = context.authState;

        if (!user) {
            throw redirect({
                to: setupRequired ? "/auth/setup" : "/auth/sign-in",
            });
        }

        return { user };
    },
    component: DashboardLayout,
});

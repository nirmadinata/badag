import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { CommandMenu } from "@/features/dashboard/components/command-menu";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

const DashboardLayout = () => {
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
            <AppSidebar />
            <SidebarInset>
                <DashboardHeader onOpenCommand={() => setCommandOpen(true)} />
                <div className="flex flex-1 flex-col p-4 md:p-6">
                    <Outlet />
                </div>
            </SidebarInset>
            <CommandMenu onOpenChange={setCommandOpen} open={commandOpen} />
        </SidebarProvider>
    );
};

export const Route = createFileRoute("/_dashboard")({
    component: DashboardLayout,
});

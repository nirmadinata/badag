import { useRouterState } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigation } from "@/features/dashboard/navigation";

export const DashboardHeader = ({
    onOpenCommand,
}: {
    onOpenCommand: () => void;
}) => {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });

    const title =
        navigation.find((item) => item.to === pathname)?.title ?? "Dashboard";

    return (
        <header className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <SidebarTrigger />
            <h1 className="font-heading text-sm font-medium">{title}</h1>
            <Button
                aria-label="Search"
                className="ml-auto"
                onClick={onOpenCommand}
                size="sm"
                variant="outline"
            >
                <SearchIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Search</span>
                <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            </Button>
        </header>
    );
};

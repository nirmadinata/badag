import { useRouterState } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigation } from "@/features/dashboard/navigation";

interface DashboardHeaderProps {
    onOpenCommand: () => void;
}

export const DashboardHeader = ({ onOpenCommand }: DashboardHeaderProps) => {
    const title = useRouterState({
        select: (state) =>
            navigation.find((item) => item.to === state.location.pathname)
                ?.title ?? "Dashboard",
    });

    return (
        <header className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <SidebarTrigger />
            <h1 className="font-heading text-sm font-medium">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
                <Button
                    aria-label="Search"
                    onClick={onOpenCommand}
                    size="sm"
                    variant="outline"
                >
                    <SearchIcon data-icon="inline-start" />
                    <span className="hidden sm:inline">Search</span>
                    <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
                </Button>
                <ThemeToggle />
            </div>
        </header>
    );
};

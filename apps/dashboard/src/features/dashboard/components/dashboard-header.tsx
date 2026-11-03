import { Link } from "@tanstack/react-router";
import {
    ChevronsUpDownIcon,
    LogOutIcon,
    SearchIcon,
    UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useDashboardHeader } from "@/features/dashboard/hooks/use-dashboard-header";

interface DashboardHeaderProps {
    onOpenCommand: () => void;
    user: {
        name: string;
        email: string;
        image?: string | null;
    };
}

export const DashboardHeader = ({
    onOpenCommand,
    user,
}: DashboardHeaderProps) => {
    const { signOut, title } = useDashboardHeader();

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
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                aria-label="Account menu"
                                size="sm"
                                variant="ghost"
                            />
                        }
                    >
                        <UserAvatar
                            className="size-7"
                            image={user.image}
                            name={user.name}
                        />
                        <span className="hidden max-w-36 truncate sm:inline">
                            {user.name}
                        </span>
                        <ChevronsUpDownIcon className="size-3.5 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="min-w-60"
                        side="bottom"
                        sideOffset={8}
                    >
                        <div className="flex items-center gap-3 px-2 py-2">
                            <UserAvatar
                                className="size-9 shrink-0"
                                image={user.image}
                                name={user.name}
                            />
                            <div className="grid min-w-0 leading-tight">
                                <span className="truncate text-sm font-medium">
                                    {user.name}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            render={<Link to="/dashboard/profile" />}
                        >
                            <UserIcon />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                void signOut();
                            }}
                            variant="destructive"
                        >
                            <LogOutIcon />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

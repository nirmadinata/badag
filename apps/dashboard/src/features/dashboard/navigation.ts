import { ActivityIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
    title: string;
    icon: LucideIcon;
    to: "/dashboard" | "/dashboard/activity" | "/dashboard/users";
    /** Only rendered for administrators; the route enforces the same rule. */
    adminOnly?: boolean;
}

/** Only destinations that exist as routes. */
export const navigation: NavItem[] = [
    { title: "Overview", icon: LayoutDashboardIcon, to: "/dashboard" },
    { title: "Activity", icon: ActivityIcon, to: "/dashboard/activity" },
    {
        title: "Users",
        icon: UsersIcon,
        to: "/dashboard/users",
        adminOnly: true,
    },
];

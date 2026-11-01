import { LayoutDashboardIcon, UsersIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
    title: string;
    icon: LucideIcon;
    to: "/dashboard" | "/dashboard/activity";
}

/** Only destinations that exist as routes. */
export const navigation: NavItem[] = [
    { title: "Overview", icon: LayoutDashboardIcon, to: "/dashboard" },
    { title: "Activity", icon: UsersIcon, to: "/dashboard/activity" },
];

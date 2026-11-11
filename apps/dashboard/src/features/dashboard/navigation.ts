import { ActivityIcon, LayoutDashboardIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
    title: string;
    icon: LucideIcon;
    to: "/" | "/activity";
}

/** Only destinations that exist as routes. */
export const navigation: NavItem[] = [
    { title: "Overview", icon: LayoutDashboardIcon, to: "/" },
    { title: "Activity", icon: ActivityIcon, to: "/activity" },
];

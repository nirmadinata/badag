import { Link } from "@tanstack/react-router";
import { Link as LinkIcon } from "lucide-react";

import { BrandMark } from "@/components/brand";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { navigation } from "@/features/dashboard/navigation";
import { DOCS_URL } from "@/lib/site";

export const AppSidebar = ({ isAdmin }: { isAdmin: boolean }) => (
    <Sidebar collapsible="icon">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        render={<Link to="/dashboard" />}
                        size="lg"
                    >
                        <BrandMark className="size-5" />
                        <span className="font-heading truncate text-sm font-semibold">
                            Badag
                        </span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {navigation
                            .filter((item) => !item.adminOnly || isAdmin)
                            .map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        render={<Link to={item.to} />}
                                        tooltip={item.title}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        render={
                            <a
                                aria-label="Documentation"
                                href={DOCS_URL}
                                rel="noreferrer"
                                target="_blank"
                            />
                        }
                        tooltip="Docs"
                    >
                        <LinkIcon />
                        <span>Docs</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
);

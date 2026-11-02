import { Link, useRouter } from "@tanstack/react-router";
import { Link as LinkIcon, LogOutIcon } from "lucide-react";

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
import { authClient } from "@/integrations/better-auth/client";
import { DOCS_URL } from "@/lib/site";

export const AppSidebar = ({ isAdmin }: { isAdmin: boolean }) => {
    const router = useRouter();

    const signOut = async () => {
        await authClient.signOut();
        await router.navigate({ to: "/auth/sign-in" });
    };

    return (
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
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={async () => {
                                await signOut();
                            }}
                            tooltip="Sign out"
                        >
                            <LogOutIcon />
                            <span>Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
};

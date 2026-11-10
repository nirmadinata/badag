import { useRouter, useRouterState } from "@tanstack/react-router";

import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { navigation } from "../navigation";

export const useDashboardHeader = () => {
    const { navigate } = useRouter();

    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });

    const title =
        navigation.find((item) => item.to === pathname)?.title ?? "Dashboard";

    const signOut = async () => {
        const { error } = await authClient.signOut();

        if (error) {
            toast.error({
                title: "Could not sign out",
                description: error.message,
            });

            return;
        }

        await navigate({ to: "/auth/sign-in" });
    };

    return { signOut, title };
};

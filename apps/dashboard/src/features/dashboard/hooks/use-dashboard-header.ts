import { useRouter, useRouterState } from "@tanstack/react-router";

import { authClient } from "@/integrations/better-auth/client";

import { navigation } from "../navigation";

export const useDashboardHeader = () => {
    const { navigate } = useRouter();

    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });

    const title =
        navigation.find((item) => item.to === pathname)?.title ?? "Dashboard";

    const signOut = async () => {
        await authClient.signOut();
        await navigate({ to: "/auth/sign-in" });
    };

    return { signOut, title };
};

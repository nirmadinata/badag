import { useSyncExternalStore } from "react";

import { getTheme, setTheme, subscribeTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

const getServerTheme = (): Theme => "light";

export const useTheme = () => {
    const theme = useSyncExternalStore(
        subscribeTheme,
        getTheme,
        getServerTheme
    );

    return {
        theme,
        setTheme,
        toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    };
};

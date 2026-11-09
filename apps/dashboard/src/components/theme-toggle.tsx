import { MoonIcon, SunIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch for the top navigation. The document class is applied
 * before first paint by the root head script, so the toggle only reflects and
 * updates the stored preference.
 */
export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const dark = theme === "dark";

    return (
        <div className="flex items-center gap-1.5">
            <SunIcon
                aria-hidden="true"
                className={cn(
                    "size-3.5",
                    dark ? "text-muted-foreground" : "text-foreground"
                )}
            />
            <Switch
                aria-label={
                    dark ? "Switch to light mode" : "Switch to dark mode"
                }
                checked={dark}
                onCheckedChange={toggleTheme}
                size="sm"
            />
            <MoonIcon
                aria-hidden="true"
                className={cn(
                    "size-3.5",
                    dark ? "text-foreground" : "text-muted-foreground"
                )}
            />
        </div>
    );
};

export type Theme = "light" | "dark";

const STORAGE_KEY = "badag-theme";

const listeners = new Set<() => void>();

const systemTheme = (): Theme =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
};

let current: Theme | undefined;

export const getTheme = (): Theme => {
    if (typeof window === "undefined") {
        return "light";
    }

    if (current === undefined) {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        current =
            stored === "light" || stored === "dark" ? stored : systemTheme();
    }

    return current;
};

export const setTheme = (theme: Theme) => {
    current = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);

    for (const listener of listeners) {
        listener();
    }
};

export const subscribeTheme = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

// Runs before first paint in the document head so a stored preference wins
// over the light default without flashing the wrong theme.
export const themeInitScript = `(() => {
    try {
        const stored = localStorage.getItem("${STORAGE_KEY}");
        const dark = stored
            ? stored === "dark"
            : matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
    } catch {}
})();`;

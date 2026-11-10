import type { ReactNode } from "react";

import { toast as toastManager } from "@/components/ui/toast";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastOptions {
    title: ReactNode;
    description?: ReactNode;
    action?: ToastAction;
    /** Milliseconds before the toast dismisses itself. `0` keeps it open. */
    timeout?: number;
    /** `high` also announces the toast through an assertive live region. */
    priority?: "low" | "high";
    /** Reusing an id updates the existing toast instead of stacking a new one. */
    id?: string;
}

const show = (
    type: ToastType,
    { action, priority, ...options }: ToastOptions
): string =>
    toastManager.add({
        ...options,
        type,
        priority: priority ?? (type === "error" ? "high" : "low"),
        actionProps: action
            ? { children: action.label, onClick: action.onClick }
            : undefined,
    });

/**
 * Application-wide toast helpers. The manager is module-global, so these work
 * from event handlers, hooks, and router callbacks alike; the `<Toaster>` in
 * the root document renders whatever they queue.
 */
export const toast = {
    show,
    success: (options: ToastOptions) => show("success", options),
    error: (options: ToastOptions) => show("error", options),
    info: (options: ToastOptions) => show("info", options),
    warning: (options: ToastOptions) => show("warning", options),
    /** Loading toasts stay open until updated or dismissed. */
    loading: (options: ToastOptions) => show("loading", options),
    dismiss: (id?: string) => toastManager.close(id),
};

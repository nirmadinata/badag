// oxlint-disable shadcn/no-restyle

import type { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
    Toast,
    ToastAction,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastPortal,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    toast as toastManager,
    useToastManager,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Per-type tint on the toast frame. The shared primitive stays neutral so every
 * type reads apart at a glance without restyling the base component.
 */
const typeFrame = cn(
    "data-[type=success]:border-success/40",
    "data-[type=warning]:border-warning/40",
    "data-[type=error]:border-destructive/40"
);

const ToastTypeIcon = ({ type }: { type: string | undefined }) => {
    switch (type) {
        case "success": {
            return <CircleCheckIcon className="text-success" />;
        }

        case "warning": {
            return <TriangleAlertIcon className="text-warning" />;
        }

        case "error": {
            return <OctagonXIcon className="text-destructive" />;
        }

        case "info": {
            return <InfoIcon className="text-muted-foreground" />;
        }

        case "loading": {
            return (
                <Loader2Icon className="text-muted-foreground animate-spin" />
            );
        }

        default: {
            return null;
        }
    }
};

const ToastList = () => {
    const { toasts } = useToastManager();

    return toasts.map((toastItem) => (
        <Toast className={typeFrame} key={toastItem.id} toast={toastItem}>
            <ToastContent>
                <span
                    className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
                    data-slot="toast-icon"
                >
                    <ToastTypeIcon type={toastItem.type} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <ToastTitle />
                    <ToastDescription />
                </div>
                <ToastAction />
                <ToastClose />
            </ToastContent>
        </Toast>
    ));
};

interface ToasterProps extends ToastPrimitive.Provider.Props {
    children?: ReactNode;
}

/**
 * Application toast host. Mounted once in the root document so every route,
 * including auth screens, shares one viewport and one manager.
 */
export const Toaster = ({
    children,
    toastManager: manager = toastManager,
    ...props
}: ToasterProps) => (
    <ToastProvider toastManager={manager} {...props}>
        {children}
        <ToastPortal>
            <ToastViewport>
                <ToastList />
            </ToastViewport>
        </ToastPortal>
    </ToastProvider>
);

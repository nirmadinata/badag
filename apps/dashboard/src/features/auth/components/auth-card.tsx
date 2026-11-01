import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps {
    eyebrow?: string;
    icon?: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export const AuthCard = ({
    eyebrow,
    icon,
    title,
    description,
    children,
    footer,
    className,
}: AuthCardProps) => (
    <div className={cn("w-full", className)}>
        <div className="bg-card rounded-2xl border p-6 shadow-xs sm:p-8">
            {(icon ?? eyebrow) ? (
                <div className="mb-5 flex items-center gap-2">
                    {icon ? (
                        <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg border">
                            {icon}
                        </span>
                    ) : null}
                    {eyebrow ? (
                        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            {eyebrow}
                        </span>
                    ) : null}
                </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                    {title}
                </h1>
                <p className="text-muted-foreground text-sm text-pretty">
                    {description}
                </p>
            </div>
            <div className="mt-6">{children}</div>
        </div>
        {footer ? (
            <div className="text-muted-foreground mt-6 text-center text-sm">
                {footer}
            </div>
        ) : null}
    </div>
);

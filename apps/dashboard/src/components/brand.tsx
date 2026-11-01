import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const BrandMark = ({ className }: { className?: string }) => (
    <svg
        aria-hidden="true"
        className={cn("size-6", className)}
        fill="none"
        viewBox="0 0 24 24"
    >
        <path
            d="M8.2 8.4 12 15.6m3.8-7.2L12 15.6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
        />
        <rect
            fill="currentColor"
            height="5.8"
            rx="1.7"
            width="5.8"
            x="2.6"
            y="2.6"
        />
        <rect
            className="opacity-45"
            fill="currentColor"
            height="5.8"
            rx="1.7"
            width="5.8"
            x="15.6"
            y="2.6"
        />
        <rect
            fill="currentColor"
            height="5.8"
            rx="1.7"
            width="5.8"
            x="9.1"
            y="15.6"
        />
    </svg>
);

interface BrandProps {
    className?: string;
    to?: string;
}

export const Brand = ({ className, to = "/" }: BrandProps) => (
    <Link
        aria-label="Badag home"
        className={cn(
            "text-foreground focus-visible:ring-ring flex items-center gap-2 rounded-md outline-none focus-visible:ring-2",
            className
        )}
        to={to}
    >
        <BrandMark />
        <span className="font-heading text-sm font-semibold tracking-tight">
            Badag
        </span>
    </Link>
);

export { BrandMark };

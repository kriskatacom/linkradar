import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
} as const;

export function Badge({
    className,
    variant = "default",
    children,
}: {
    className?: string;
    variant?: keyof typeof variants;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                variants[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}

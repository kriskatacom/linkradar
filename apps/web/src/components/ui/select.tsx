import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900",
                className,
            )}
            {...props}
        >
            {children}
        </select>
    );
}

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700",
                className,
            )}
            {...props}
        />
    );
}

export function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return <span className={cn("uppercase", className)} {...props} />;
}

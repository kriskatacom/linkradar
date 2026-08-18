import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "relative w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700",
                className,
            )}
            role="alert"
            {...props}
        />
    );
}

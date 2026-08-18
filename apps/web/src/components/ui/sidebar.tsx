import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
    return <aside className={cn("border-r border-slate-200 bg-white", className)} {...props} />;
}

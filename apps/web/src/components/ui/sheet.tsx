import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Sheet({ open, children }: { open: boolean; children: ReactNode }) {
    if (!open) {
        return null;
    }

    return <>{children}</>;
}

export function SheetContent({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40">
            <div className={cn("h-full w-72 bg-white p-4 shadow-xl", className)}>{children}</div>
        </div>
    );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type InfoItemProps = {
    label: string;
    children: ReactNode;
    className?: string;
};

export function InfoItem({ label, children, className }: InfoItemProps) {
    return (
        <div
            className={cn(
                "rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition-colors duration-200",
                "hover:border-slate-300 hover:bg-slate-50",
                className,
            )}
        >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="min-w-0 text-sm font-medium text-slate-900 sm:text-right">{children}</dd>
            </div>
        </div>
    );
}

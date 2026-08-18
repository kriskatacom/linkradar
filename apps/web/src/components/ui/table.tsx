import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className={cn("min-w-full divide-y divide-slate-200 text-sm", className)}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children }: { children: ReactNode }) {
    return <thead className="bg-slate-50">{children}</thead>;
}

export function TableBody({ children }: { className?: string; children: ReactNode }) {
    return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
    return <tr>{children}</tr>;
}

export function TableHeaderCell({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <th className={cn("px-4 py-3 text-left font-medium text-slate-600", className)}>{children}</th>
    );
}

export function TableCell({ children, className }: { children?: ReactNode; className?: string }) {
    return <td className={cn("px-4 py-3 text-slate-700", className)}>{children}</td>;
}

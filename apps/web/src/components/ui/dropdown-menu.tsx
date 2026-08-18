import { useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DropdownMenu({ children }: { children: ReactNode }) {
    return <div className="relative">{children}</div>;
}

export function DropdownMenuTrigger({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    );
}

export function DropdownMenuContent({
    open,
    className,
    children,
}: {
    open: boolean;
    className?: string;
    children: ReactNode;
}) {
    if (!open) {
        return null;
    }

    return (
        <div
            className={cn(
                "absolute right-0 z-50 mt-2 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-lg",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function DropdownMenuItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={cn(
                "flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100",
                className,
            )}
            type="button"
            {...props}
        />
    );
}

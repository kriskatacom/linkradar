import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AlertDialog({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
    destructive = false,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        className={cn(destructive && "bg-red-600 hover:bg-red-700")}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
            {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
    );
}

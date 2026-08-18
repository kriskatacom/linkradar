import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className, disabled, ...props }: CheckboxProps) {
    return (
        <span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
            <input
                type="checkbox"
                disabled={disabled}
                className={cn(
                    "peer h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-slate-300 bg-white shadow-sm transition-colors",
                    "checked:border-slate-900 checked:bg-slate-900",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                {...props}
            />
            <Check
                aria-hidden
                strokeWidth={3}
                className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            />
        </span>
    );
}

import { Controller, FormProvider, useFormContext, type ControllerProps } from "react-hook-form";

import { cn } from "@/lib/utils";

export const Form = FormProvider;
export const FormField = Controller;

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormMessage({ name }: { name: string }) {
    const {
        formState: { errors },
    } = useFormContext();

    const fieldError = errors[name];
    if (!fieldError) {
        return null;
    }

    const message = typeof fieldError.message === "string" ? fieldError.message : "Invalid field";
    return <p className="text-xs text-red-600">{message}</p>;
}

export type FormControllerProps<T extends object> = ControllerProps<T>;

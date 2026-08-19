import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api-error";
import { useResetPasswordMutation } from "../api/authApi";
import { AuthLayout } from "../components/auth-layout";
import { PasswordField } from "../components/password-field";

const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "Password must contain at least 8 characters."),
        confirmPassword: z.string().min(1, "Please confirm your password."),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function tokenStatusMessage(code: string): { title: string; message: string } {
    if (code === "TOKEN_EXPIRED") {
        return {
            title: "Link expired",
            message: "This reset link has expired. Request a new password reset email.",
        };
    }
    if (code === "TOKEN_ALREADY_USED") {
        return {
            title: "Link already used",
            message: "This reset link has already been used. Request a new password reset email.",
        };
    }
    if (code === "INVALID_TOKEN") {
        return {
            title: "Invalid link",
            message: "This reset link is invalid. Request a new password reset email.",
        };
    }
    return {
        title: "Reset failed",
        message: "We could not reset your password. Please try again.",
    };
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token")?.trim() ?? "";
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [resetPassword, { isLoading }] = useResetPasswordMutation();
    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const missingToken = token.length === 0;
    const status = missingToken
        ? tokenStatusMessage("INVALID_TOKEN")
        : submitError
          ? tokenStatusMessage(submitError)
          : null;

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitError(null);
        setFormError(null);
        setSuccessMessage(null);

        try {
            const result = await resetPassword({
                token,
                password: values.password,
            }).unwrap();
            setSuccessMessage(result.data.message);
        } catch (error) {
            const parsed = getApiError(error);
            if (
                parsed.code === "TOKEN_EXPIRED" ||
                parsed.code === "TOKEN_ALREADY_USED" ||
                parsed.code === "INVALID_TOKEN"
            ) {
                setSubmitError(parsed.code);
                return;
            }
            setFormError(parsed.message);
        }
    });

    return (
        <AuthLayout
            title={successMessage ? "Password reset" : (status?.title ?? "Reset password")}
            subtitle={
                successMessage
                    ? "You can now sign in with your new password."
                    : (status?.message ?? "Choose a new password for your account.")
            }
            footer={
                <span>
                    <Link to="/login" className="font-medium text-slate-900 underline">
                        Back to sign in
                    </Link>
                    {" · "}
                    <Link to="/forgot-password" className="font-medium text-slate-900 underline">
                        Request a new link
                    </Link>
                </span>
            }
        >
            {successMessage ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    {successMessage}
                </Alert>
            ) : missingToken ? (
                <Alert>{status?.message}</Alert>
            ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                    {submitError ? <Alert>{status?.message}</Alert> : null}
                    {formError ? <Alert>{formError}</Alert> : null}

                    <PasswordField
                        label="New password"
                        value={form.watch("password")}
                        onChange={(value) =>
                            form.setValue("password", value, { shouldValidate: true })
                        }
                        onBlur={() => void form.trigger("password")}
                        name="password"
                        autoComplete="new-password"
                        errorMessages={
                            form.formState.errors.password?.message
                                ? [form.formState.errors.password.message]
                                : undefined
                        }
                    />

                    <PasswordField
                        label="Confirm password"
                        value={form.watch("confirmPassword")}
                        onChange={(value) =>
                            form.setValue("confirmPassword", value, { shouldValidate: true })
                        }
                        onBlur={() => void form.trigger("confirmPassword")}
                        name="confirmPassword"
                        autoComplete="new-password"
                        errorMessages={
                            form.formState.errors.confirmPassword?.message
                                ? [form.formState.errors.confirmPassword.message]
                                : undefined
                        }
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading}
                        loadingText="Updating password..."
                    >
                        Reset password
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}

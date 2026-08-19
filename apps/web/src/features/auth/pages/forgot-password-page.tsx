import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiError } from "@/lib/api-error";
import { useForgotPasswordMutation } from "../api/authApi";
import { AuthLayout } from "../components/auth-layout";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitError(null);
        setSuccessMessage(null);

        try {
            const result = await forgotPassword({ email: values.email }).unwrap();
            setSuccessMessage(result.data.message);
        } catch (error) {
            setSubmitError(getApiError(error).message);
        }
    });

    return (
        <AuthLayout
            title="Forgot password"
            subtitle="Enter your email and we will send a reset link if an account exists."
            footer={
                <span>
                    Remembered your password?{" "}
                    <Link to="/login" className="font-medium text-slate-900 underline">
                        Sign in
                    </Link>
                </span>
            }
        >
            <form className="space-y-4" onSubmit={onSubmit}>
                {submitError ? <Alert>{submitError}</Alert> : null}
                {successMessage ? (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        {successMessage}
                    </Alert>
                ) : null}

                <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        {...form.register("email")}
                    />
                    {form.formState.errors.email?.message ? (
                        <p className="text-xs text-red-600">
                            {form.formState.errors.email.message}
                        </p>
                    ) : null}
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    loading={isLoading}
                    loadingText="Sending..."
                >
                    Send reset link
                </Button>
            </form>
        </AuthLayout>
    );
}

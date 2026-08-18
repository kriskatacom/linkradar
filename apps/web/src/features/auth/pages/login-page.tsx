import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiError } from "@/lib/api-error";
import { useLazyMeQuery, useLoginMutation } from "../api/authApi";
import { AuthLayout } from "../components/auth-layout";
import { PasswordField } from "../components/password-field";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(1, "Password is required."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
    const navigate = useNavigate();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [login, { isLoading }] = useLoginMutation();
    const [fetchMe] = useLazyMeQuery();
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitError(null);
        setFieldErrors({});

        try {
            await login(values).unwrap();
            await fetchMe().unwrap();
            toast.success("Logged in successfully.");
            navigate("/app/dashboard");
        } catch (error) {
            const parsed = getApiError(error);
            if (parsed.code === "INVALID_CREDENTIALS") {
                setSubmitError("Invalid email or password.");
                return;
            }
            if (parsed.fields) {
                setFieldErrors(parsed.fields);
            }
            setSubmitError(parsed.message);
        }
    });

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue to your dashboard."
            footer={
                <span>
                    New to LinkRadar?{" "}
                    <Link to="/register" className="font-medium text-slate-900 underline">
                        Create account
                    </Link>
                </span>
            }
        >
            <form className="space-y-4" onSubmit={onSubmit}>
                {submitError ? <Alert>{submitError}</Alert> : null}

                <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        {...form.register("email")}
                    />
                    {(form.formState.errors.email?.message
                        ? [form.formState.errors.email.message]
                        : (fieldErrors.email ?? [])
                    ).map((message) => (
                        <p key={message} className="text-xs text-red-600">
                            {message}
                        </p>
                    ))}
                </div>

                <PasswordField
                    label="Password"
                    value={form.watch("password")}
                    onChange={(value) => form.setValue("password", value, { shouldValidate: true })}
                    onBlur={() => void form.trigger("password")}
                    name="password"
                    autoComplete="current-password"
                    errorMessages={
                        form.formState.errors.password?.message
                            ? [form.formState.errors.password.message]
                            : fieldErrors.password
                    }
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                </Button>
            </form>
        </AuthLayout>
    );
}

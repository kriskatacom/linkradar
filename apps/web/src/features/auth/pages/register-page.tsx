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
import { useLazyMeQuery, useRegisterMutation } from "../api/authApi";
import { AuthLayout } from "../components/auth-layout";
import { PasswordField } from "../components/password-field";

const registerSchema = z
    .object({
        name: z.string().min(2, "Name must contain at least 2 characters."),
        email: z.string().email("Please enter a valid email address."),
        password: z.string().min(8, "Password must contain at least 8 characters."),
        confirmPassword: z.string().min(1, "Please confirm your password."),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
    const navigate = useNavigate();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [registerUser, { isLoading }] = useRegisterMutation();
    const [fetchMe] = useLazyMeQuery();
    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitError(null);
        setFieldErrors({});

        try {
            await registerUser({
                name: values.name,
                email: values.email,
                password: values.password,
            }).unwrap();
            await fetchMe().unwrap();
            toast.success("Account created successfully.");
            navigate("/app/dashboard");
        } catch (error) {
            const parsed = getApiError(error);
            if (parsed.fields) {
                setFieldErrors(parsed.fields);
            }
            setSubmitError(parsed.message);
        }
    });

    return (
        <AuthLayout
            title="Create account"
            subtitle="Start monitoring your websites with LinkRadar."
            footer={
                <span>
                    Already have an account?{" "}
                    <Link to="/login" className="font-medium text-slate-900 underline">
                        Sign in
                    </Link>
                </span>
            }
        >
            <form className="space-y-4" onSubmit={onSubmit}>
                {submitError ? <Alert>{submitError}</Alert> : null}

                <div className="space-y-2">
                    <Label htmlFor="register-name">Name</Label>
                    <Input id="register-name" autoComplete="name" {...form.register("name")} />
                    {(form.formState.errors.name?.message
                        ? [form.formState.errors.name.message]
                        : (fieldErrors.name ?? [])
                    ).map((message) => (
                        <p key={message} className="text-xs text-red-600">
                            {message}
                        </p>
                    ))}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                        id="register-email"
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
                    autoComplete="new-password"
                    errorMessages={
                        form.formState.errors.password?.message
                            ? [form.formState.errors.password.message]
                            : fieldErrors.password
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
                    loadingText="Creating account..."
                >
                    Create account
                </Button>
            </form>
        </AuthLayout>
    );
}

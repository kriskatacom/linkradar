import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";
import { useVerifyEmailMutation } from "../api/authApi";
import { AuthLayout } from "../components/auth-layout";

type VerifyStatus = "loading" | "success" | "invalid" | "expired" | "used" | "failed";

const verifyRequests = new Map<string, Promise<VerifyStatus>>();

function statusFromError(error: unknown): VerifyStatus {
    const code = getApiError(error).code;
    if (code === "TOKEN_EXPIRED") {
        return "expired";
    }
    if (code === "TOKEN_ALREADY_USED") {
        return "used";
    }
    if (code === "INVALID_TOKEN") {
        return "invalid";
    }
    return "failed";
}

function statusCopy(status: VerifyStatus): { title: string; message: string } {
    switch (status) {
        case "loading":
            return {
                title: "Verifying email",
                message: "Please wait while we confirm your email address.",
            };
        case "success":
            return {
                title: "Email verified",
                message: "Your email address has been verified.",
            };
        case "expired":
            return {
                title: "Link expired",
                message: "This verification link has expired. Request a new one from settings.",
            };
        case "used":
            return {
                title: "Link already used",
                message: "This verification link has already been used.",
            };
        case "invalid":
            return {
                title: "Invalid link",
                message: "This verification link is invalid or incomplete.",
            };
        default:
            return {
                title: "Verification failed",
                message: "We could not verify your email. Please try again.",
            };
    }
}

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token")?.trim() ?? "";
    const user = useAppSelector((state) => state.auth.user);
    const [verifyEmail] = useVerifyEmailMutation();
    const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "invalid");

    useEffect(() => {
        if (!token) {
            return;
        }

        let cancelled = false;
        let request = verifyRequests.get(token);
        if (!request) {
            request = verifyEmail({ token })
                .unwrap()
                .then(() => "success" as const)
                .catch((error: unknown) => statusFromError(error));
            verifyRequests.set(token, request);
        }

        void request.then((next) => {
            if (!cancelled) {
                setStatus(next);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [token, verifyEmail]);

    const copy = statusCopy(status);

    return (
        <AuthLayout title={copy.title} subtitle={copy.message}>
            {status === "loading" ? (
                <p className="text-sm text-slate-600">Verifying your email...</p>
            ) : null}

            {status === "success" ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    {copy.message}
                </Alert>
            ) : null}

            {status !== "loading" && status !== "success" ? <Alert>{copy.message}</Alert> : null}

            <div className="mt-6">
                <Button
                    className="w-full"
                    disabled={status === "loading"}
                    onClick={() => navigate(user ? "/app/dashboard" : "/login")}
                >
                    {user ? "Continue to dashboard" : "Sign in"}
                </Button>
            </div>
        </AuthLayout>
    );
}

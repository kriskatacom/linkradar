import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/admin/components/admin-ui";
import {
    useRequestEmailVerificationMutation,
    useUpdateThemeMutation,
} from "@/features/auth/api/authApi";
import type { ThemePreference } from "@/features/settings/theme";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const themeOptions: Array<{
    value: ThemePreference;
    label: string;
    description: string;
    icon: typeof Sun;
}> = [
    {
        value: "light",
        label: "Light",
        description: "Always use the light theme.",
        icon: Sun,
    },
    {
        value: "dark",
        label: "Dark",
        description: "Always use the dark theme.",
        icon: Moon,
    },
    {
        value: "system",
        label: "System",
        description: "Match your operating system preference.",
        icon: Monitor,
    },
];

export function SettingsPage() {
    const preference = useAppSelector((state) => state.theme.preference);
    const user = useAppSelector((state) => state.auth.user);
    const [updateTheme, { isLoading }] = useUpdateThemeMutation();
    const [requestVerification, { isLoading: isResending }] = useRequestEmailVerificationMutation();

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="Manage your LinkRadar preferences." />

            {user && !user.emailVerified ? (
                <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-medium text-slate-900">Email verification</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {user.email} is not verified yet. Check your inbox or resend a verification
                        link.
                    </p>
                    <Button
                        className="mt-4"
                        loading={isResending}
                        loadingText="Sending..."
                        onClick={async () => {
                            try {
                                const result = await requestVerification().unwrap();
                                toast.success(result.data.message);
                            } catch (error) {
                                toast.error(getApiError(error).message);
                            }
                        }}
                    >
                        Resend verification email
                    </Button>
                </section>
            ) : null}

            <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium text-slate-900">Appearance</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Choose how LinkRadar looks. System follows your device setting and updates
                    automatically.
                </p>

                <div
                    role="radiogroup"
                    aria-label="Theme"
                    className="mt-4 grid gap-3 sm:grid-cols-3"
                >
                    {themeOptions.map((option) => {
                        const selected = preference === option.value;
                        const Icon = option.icon;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={option.label}
                                disabled={isLoading}
                                onClick={() => {
                                    void updateTheme({ theme: option.value });
                                }}
                                className={cn(
                                    "flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                                    selected
                                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                )}
                            >
                                <Icon className="h-5 w-5 text-slate-700" aria-hidden />
                                <span>
                                    <span className="block text-sm font-medium text-slate-900">
                                        {option.label}
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-600">
                                        {option.description}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

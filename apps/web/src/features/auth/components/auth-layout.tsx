import type { ReactNode } from "react";

export function AuthLayout({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="grid min-h-screen bg-slate-50 md:grid-cols-2">
            <div className="hidden flex-col justify-between bg-white p-12 md:flex">
                <div className="text-xl font-semibold text-slate-900">LinkRadar</div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                        Scan. Detect. Fix.
                    </h1>
                    <p className="max-w-sm text-slate-600">
                        Better websites with continuous link monitoring.
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                    <div className="mt-6">{children}</div>
                    <div className="mt-6 text-sm text-slate-600">{footer}</div>
                </div>
            </div>
        </div>
    );
}

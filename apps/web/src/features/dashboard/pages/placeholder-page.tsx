export function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">This section is coming soon.</p>
        </div>
    );
}

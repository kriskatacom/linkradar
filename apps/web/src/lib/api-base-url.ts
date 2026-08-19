export function resolveApiBaseUrl(value: string | undefined): string {
    const trimmed = value?.trim();

    if (!trimmed || trimmed === "/") {
        return "";
    }

    return trimmed.replace(/\/$/, "");
}

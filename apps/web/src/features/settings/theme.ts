export const THEME_CACHE_KEY = "linkradar.theme.cache";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export type ThemeCache = {
    userId: string;
    theme: ThemePreference;
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
    return value === "light" || value === "dark" || value === "system";
}

export function parseThemePreference(value: unknown): ThemePreference {
    return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function readThemeCache(): ThemeCache | null {
    try {
        const raw = localStorage.getItem(THEME_CACHE_KEY);
        if (!raw) {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            !("userId" in parsed) ||
            !("theme" in parsed) ||
            typeof parsed.userId !== "string" ||
            !isThemePreference(parsed.theme)
        ) {
            return null;
        }

        return { userId: parsed.userId, theme: parsed.theme };
    } catch {
        return null;
    }
}

export function writeThemeCache(userId: string, theme: ThemePreference): void {
    try {
        localStorage.setItem(
            THEME_CACHE_KEY,
            JSON.stringify({ userId, theme } satisfies ThemeCache),
        );
    } catch {
        // Ignore storage failures in private browsing / tests.
    }
}

export function clearThemeCache(): void {
    try {
        localStorage.removeItem(THEME_CACHE_KEY);
        localStorage.removeItem("linkradar.theme");
    } catch {
        // Ignore storage failures.
    }
}

export function getSystemPrefersDark(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
    if (preference === "system") {
        return getSystemPrefersDark() ? "dark" : "light";
    }

    return preference;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
    const resolved = resolveTheme(preference);
    applyResolvedTheme(resolved);
    return resolved;
}

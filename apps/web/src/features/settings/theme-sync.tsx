import { useEffect } from "react";

import { useAppSelector } from "@/hooks/redux";

import { applyThemePreference } from "./theme";

export function ThemeSync() {
    const preference = useAppSelector((state) => state.theme.preference);

    useEffect(() => {
        applyThemePreference(preference);

        if (preference !== "system" || typeof window.matchMedia !== "function") {
            return;
        }

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            applyThemePreference("system");
        };

        media.addEventListener("change", onChange);
        return () => {
            media.removeEventListener("change", onChange);
        };
    }, [preference]);

    return null;
}

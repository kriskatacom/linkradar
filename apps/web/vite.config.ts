import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

function isSafeHost(value: string): boolean {
    return /^[A-Za-z0-9.-]+$/.test(value);
}

export default defineConfig(({ mode }) => {
    const rootEnv = loadEnv(mode, import.meta.dirname + "/../..", "");
    const lanHost = rootEnv.LAN_HOST?.trim();
    const apiPort = rootEnv.API_PORT?.trim() || "3000";
    const allowedHosts = ["website.local", "localhost", "127.0.0.1"];

    if (lanHost && isSafeHost(lanHost)) {
        allowedHosts.push(lanHost);
    }

    return {
        plugins: [react(), tailwindcss()],
        server: {
            host: "0.0.0.0",
            allowedHosts,
            proxy: {
                "/api": {
                    target: `http://127.0.0.1:${apiPort}`,
                    changeOrigin: true,
                },
            },
        },
        resolve: {
            alias: {
                "@": import.meta.dirname + "/src",
            },
        },
        test: {
            environment: "jsdom",
            setupFiles: ["./tests/setup.ts"],
        },
    };
});

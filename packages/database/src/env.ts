import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: resolve(packageRoot, ".env") });
config({ path: resolve(packageRoot, "../../.env") });

function requireEnv(name: string): string {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export function getDatabaseEnv() {
    const portRaw = requireEnv("DB_PORT");
    const port = Number(portRaw);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("Invalid environment variable: DB_PORT");
    }

    return {
        host: requireEnv("DB_HOST"),
        port,
        database: requireEnv("DB_DATABASE"),
        user: requireEnv("DB_USER"),
        password: process.env.DB_PASSWORD ?? "",
    };
}

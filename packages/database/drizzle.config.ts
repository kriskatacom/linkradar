import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageRoot, ".env") });
config({ path: resolve(packageRoot, "../../.env") });

function readEnv(name: string, fallback: string): string {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        return fallback;
    }

    return value;
}

export default defineConfig({
    dialect: "mysql",
    schema: "./src/schema/index.ts",
    out: "./migrations",
    dbCredentials: {
        host: readEnv("DB_HOST", "127.0.0.1"),
        port: Number(readEnv("DB_PORT", "3306")),
        user: readEnv("DB_USER", "root"),
        password: process.env.DB_PASSWORD ?? "",
        database: readEnv("DB_DATABASE", "linkradar"),
    },
});
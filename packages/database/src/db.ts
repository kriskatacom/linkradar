import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { getDatabaseEnv } from "./env.js";
import * as schema from "./schema/index.js";

const env = getDatabaseEnv();

const pool = mysql.createPool({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
    connectionLimit: 10,
    waitForConnections: true,
});

export const db = drizzle(pool, {
    schema,
    mode: "default",
});

export async function checkDatabaseConnection(): Promise<void> {
    try {
        const connection = await pool.getConnection();

        try {
            await connection.query("SELECT 1");
        } finally {
            connection.release();
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Database connection failed: ${message}`);
    }
}

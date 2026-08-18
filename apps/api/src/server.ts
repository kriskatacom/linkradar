import { checkDatabaseConnection } from "@link-radar/database";

import { buildApp } from "./app.js";
import { getApiEnv } from "./config/env.js";
import { DrizzleAuthRepository } from "./modules/auth/auth.repository.drizzle.js";

const env = getApiEnv();
const app = await buildApp();

await checkDatabaseConnection();

if (env.isDevelopment) {
    const deleted = await new DrizzleAuthRepository().deleteExpiredSessions();
    app.log.info({ deleted }, "Deleted expired auth sessions");
}

await app.listen({
    host: env.host,
    port: env.port,
});

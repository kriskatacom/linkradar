import { checkDatabaseConnection } from "@link-radar/database";

import { buildApp } from "./app.js";
import { getApiEnv } from "./config/env.js";

const env = getApiEnv();
const app = await buildApp();

await checkDatabaseConnection();

await app.listen({
    host: env.host,
    port: env.port,
});

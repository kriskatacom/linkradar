import Fastify from "fastify";
import type { ScanStatus } from "@link-radar/contracts";

const status: ScanStatus = "running";

const app = Fastify({
    logger: true,
});

app.get("/health", async () => {
    return {
        success: true,
        service: "link-radar-api",
    };
});

await app.listen({
    port: 3000,
    host: "0.0.0.0",
});

console.log("API scan status:", status);
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

loadDotEnv(resolve(root, ".env"));

const detectedIp = detectLanIPv4();
const configuredHost = process.env.LAN_HOST?.trim() || "";
const lanHost = configuredHost || detectedIp || "";
const lanUrl = lanHost ? `https://${lanHost}` : "https://<LAN_IP>";

console.log("LinkRadar LAN development");
console.log("");
console.log(`Detected LAN IP:     ${detectedIp ?? "(none found)"}`);
console.log(`LAN_HOST in .env:    ${configuredHost || "(not set)"}`);
console.log(`Open on other devices: ${lanUrl}`);
console.log("Desktop URLs:          https://website.local  https://api.local");
console.log("");

if (!configuredHost) {
    console.log("Set LAN_HOST in .env to your current Wi-Fi IP, then restart Vite:");
    console.log("");
    console.log("  hostname -I");
    console.log(`  LAN_HOST=${detectedIp ?? "192.168.x.x"}`);
    console.log(`  LAN_ENABLED=true`);
    console.log(`  LAN_FRONTEND_URL=${lanUrl}`);
    console.log(`  LAN_API_URL=${lanUrl}/api`);
    console.log("");
}

console.log("HTTPS certificate (include the current LAN IP; do not hardcode it in git):");
console.log("");
console.log("  mkcert \\");
console.log("    -cert-file .certs/linkradar.pem \\");
console.log("    -key-file .certs/linkradar-key.pem \\");
console.log("    website.local api.local localhost 127.0.0.1 ::1 \\");
console.log(`    ${lanHost || "<LAN_IP>"}`);
console.log("");
console.log("  sudo cp .certs/linkradar.pem /etc/nginx/ssl/linkradar/linkradar.pem");
console.log("  sudo cp .certs/linkradar-key.pem /etc/nginx/ssl/linkradar/linkradar-key.pem");
console.log("  sudo cp deploy/nginx/linkradar.conf /etc/nginx/sites-available/linkradar");
console.log("  sudo nginx -t && sudo systemctl reload nginx");
console.log("");
console.log("Trust mkcert on phones/tablets (install rootCA.pem only, never rootCA-key.pem):");
console.log("  mkcert -CAROOT");
console.log("");
console.log("Firewall (do not publish 3000, 5173, 3306, 1025, or 8025):");
console.log("  sudo ufw allow 'Nginx Full'");
console.log("");
console.log("If the phone cannot reach the laptop, check router AP/client/guest isolation.");
console.log("See docs/lan-development.md for the full checklist.");
console.log("");

if (!existsSync(resolve(root, "compose.yml"))) {
    console.error("compose.yml not found.");
    process.exit(1);
}

const compose = spawn("docker", ["compose", "up", "-d"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
});

compose.on("exit", (code) => {
    if (code !== 0) {
        console.error("docker compose up failed. Start MySQL/Mailpit yourself if needed.");
    }

    const childEnv = {
        ...process.env,
        LAN_ENABLED: process.env.LAN_ENABLED || "true",
        LAN_HOST: process.env.LAN_HOST || detectedIp || "",
    };

    const api = spawn("npm", ["run", "dev", "--workspace=api"], {
        cwd: root,
        stdio: "inherit",
        env: childEnv,
    });
    const web = spawn("npm", ["run", "dev", "--workspace=@link-radar/web"], {
        cwd: root,
        stdio: "inherit",
        env: childEnv,
    });

    const shutdown = (signal) => {
        api.kill(signal);
        web.kill(signal);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    const onChildExit = (name) => (exitCode) => {
        if (exitCode) {
            console.error(`${name} exited with code ${exitCode}`);
        }
    };

    api.on("exit", onChildExit("api"));
    web.on("exit", onChildExit("web"));
});

function detectLanIPv4() {
    const nets = networkInterfaces();

    for (const addrs of Object.values(nets)) {
        for (const addr of addrs ?? []) {
            if (addr.family === "IPv4" && !addr.internal) {
                return addr.address;
            }
        }
    }

    return null;
}

function loadDotEnv(filePath) {
    if (!existsSync(filePath)) {
        return;
    }

    for (const line of readFileSync(filePath, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separator = trimmed.indexOf("=");
        if (separator <= 0) {
            continue;
        }

        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

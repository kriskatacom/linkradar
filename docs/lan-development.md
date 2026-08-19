# LAN development

LinkRadar’s desktop setup stays on `https://website.local` and `https://api.local`. Other phones, tablets, and PCs on the same Wi-Fi should open the laptop’s LAN IP over HTTPS through Nginx.

```text
Phone / tablet / other PC
        ↓
https://<LAN_IP>
        ↓
Nginx (ports 80/443 only)
        ↓
Vite (:5173) and API (:3000) on the laptop
```

Do not expose Vite, the API, MySQL, or Mailpit on the LAN.

## 1. Same Wi-Fi

Connect the laptop and the test device to the same network. Guest Wi-Fi and router **AP isolation / client isolation** often block device-to-device traffic.

## 2. Find the laptop IP

```bash
hostname -I
```

Use the Wi-Fi IPv4 address (for example `192.168.1.105`). It changes between networks. Do not commit it.

## 3. Configure `.env`

```env
LAN_ENABLED=true
LAN_HOST=192.168.1.105
LAN_FRONTEND_URL=https://192.168.1.105
LAN_API_URL=https://192.168.1.105/api
```

Leave `API_HOST=127.0.0.1` unless you are debugging the API directly. Nginx talks to the API on loopback. To listen on all interfaces for debugging only:

```env
API_HOST=0.0.0.0
API_PORT=3000
```

## 4. HTTPS certificate

Keep mkcert for `website.local` and `api.local`. Regenerate the cert when the LAN IP changes:

```bash
mkcert \
    -cert-file .certs/linkradar.pem \
    -key-file .certs/linkradar-key.pem \
    website.local \
    api.local \
    localhost \
    127.0.0.1 \
    ::1 \
    192.168.1.105
```

Then install it where Nginx reads it:

```bash
sudo mkdir -p /etc/nginx/ssl/linkradar
sudo cp .certs/linkradar.pem /etc/nginx/ssl/linkradar/linkradar.pem
sudo cp .certs/linkradar-key.pem /etc/nginx/ssl/linkradar/linkradar-key.pem
```

## 5. Trust the mkcert CA on the phone

Other devices will warn until they trust the local CA.

```bash
mkcert -CAROOT
```

Install **`rootCA.pem`** as a trusted certificate authority on the phone or tablet.

Never copy or share **`rootCA-key.pem`**. That private key must stay on the development machine.

## 6. Nginx

Repo config: `deploy/nginx/linkradar.conf`.

- `https://website.local` → frontend, `/api/` → API (same origin)
- `https://api.local` → API (debug)
- `https://<LAN_IP>` → frontend, `/api/` → API (IPv4 `Host` header, no hardcoded IP)

```bash
sudo cp deploy/nginx/linkradar.conf /etc/nginx/sites-available/linkradar
sudo ln -sf /etc/nginx/sites-available/linkradar /etc/nginx/sites-enabled/linkradar
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Firewall

Prefer only HTTP/HTTPS on the LAN:

```bash
sudo ufw allow 'Nginx Full'
```

Do **not** publish these to other devices:

- `3000` API
- `5173` Vite
- `3306` MySQL
- `1025` Mailpit SMTP
- `8025` Mailpit UI

Compose binds MySQL and Mailpit to `127.0.0.1`.

## 8. Start services

```bash
docker compose up -d
npm run dev:lan
```

Or start API and web as usual after Docker is up. Restart Vite after changing `LAN_HOST` so it is added to `allowedHosts`.

Open `https://<LAN_IP>` on the phone.

## Cookies and API URLs

The web app uses same-origin **`/api`** by default (empty `VITE_API_URL`). Refresh cookies are host-only. Do not set `AUTH_COOKIE_DOMAIN` to `website.local` or `api.local`.

For same-origin HTTPS, `SameSite=lax` and `Secure=true` are enough. Split-origin `website.local` + `api.local` still needs `SameSite=none`, `Secure`, and `Partitioned`.

## Email links on a phone

Verification and reset emails use `APP_URL`. `https://website.local` will not resolve on a phone. For device testing, set `APP_URL` to `https://<LAN_IP>`.

## Checklist

1. Laptop and phone on the same Wi-Fi (not a guest/isolated network).
2. `hostname -I` → set `LAN_HOST`.
3. mkcert includes that IP; copy certs for Nginx; reload Nginx.
4. `docker compose up -d`
5. Start API and Vite (`npm run dev:lan`).
6. Open `https://<LAN_IP>` on the phone.
7. Install `rootCA.pem` if the browser warns.
8. Confirm login, refresh, and that camera/microphone prompts are allowed in a secure context.

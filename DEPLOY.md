# Deploying CemPulse on astrikos.xyz

POC: `cempulse` · Frontend port `3355` · Backend port `4355`
(Convention: see `deployment_context.md` in this repo.)

## Process table

| Thing | Value |
| --- | --- |
| Frontend subdomain | `cempulse.astrikos.xyz` |
| Backend subdomain | `cempulse-api.astrikos.xyz` |
| Frontend port | `3355` |
| Backend port | `4355` |
| pm2 frontend name | `cempulse_3355` |
| pm2 backend name | `cempulse_be_4355` |

CemPulse's backend is a single Express process serving both the REST API
(`/api/...`) and, once built, the static frontend bundle — but for this
deployment the frontend is served as its own static process per the
convention, so the backend only needs to serve `/api`.

Note: this app has no websocket/socket.io server. The nginx backend block
still includes the websocket-upgrade headers per convention (harmless if
unused, and future-proofs the block if sockets are ever added).

## 1. Build + run the frontend (static CRA build)

```bash
cd client
npm install
REACT_APP_API_URL=https://cempulse-api.astrikos.xyz:8443/api CI=false npm run build
pm2 start npx --name "cempulse_3355" -- serve -s build -p 3355
```

`REACT_APP_API_URL` is baked into the build at build time (CRA env vars are
compile-time, not runtime) — rebuild whenever this value needs to change.

## 2. Build + run the backend (Express, no database)

```bash
cd server
npm install
```

The backend keeps all state in memory (seeded with 30 days of demo history on
boot) — no database to provision or migrate. Set these env vars before
starting (e.g. in `server/.env`, copy from `server/.env.example`):

```
PORT=4355
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://cempulse.astrikos.xyz:8443,http://localhost:3000
```

`CORS_ORIGIN` accepts a comma-separated list, so local dev
(`http://localhost:3000`) keeps working alongside the production frontend
origin.

```bash
PORT=4355 pm2 start index.js --name "cempulse_be_4355"
pm2 save
```

Demo logins and API routes are unchanged (`admin` / `Astrikos2026`).

## 3. nginx

`astrikos.conf` — frontend:
```nginx
server {
    listen 8443 ssl;
    ssl_certificate     /etc/certs/astrikos.xyz/fullchain.pem;
    ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
    server_name cempulse.astrikos.xyz;
    location / {
        add_header 'Access-Control-Allow-Origin' '*' always;
        proxy_pass http://127.0.0.1:3355;
    }
}
```

`astriverse.conf` — backend (requires `map $http_upgrade $connection_upgrade {…}`
once at the top of the file, per convention):
```nginx
server {
    listen 8443 ssl;
    ssl_certificate     /etc/certs/astrikos.xyz/fullchain.pem;
    ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
    server_name cempulse-api.astrikos.xyz;
    location / {
        proxy_pass http://127.0.0.1:4355;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }
}
```

Apply:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Cloudflare DNS

- `cempulse.astrikos.xyz` → **Orange** (proxied)
- `cempulse-api.astrikos.xyz` → **Gray** (DNS-only)

## 5. Verify

```bash
curl -k https://cempulse.astrikos.xyz:8443              # SPA HTML
curl -k https://cempulse-api.astrikos.xyz:8443/api/health  # backend health check
```

Then open `https://cempulse.astrikos.xyz:8443` in a browser and confirm login
with `admin` / `Astrikos2026` works end-to-end.
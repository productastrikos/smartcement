# CemPulse — Smart Cement Manufacturing Dashboard

A full-stack Industry 4.0 dashboard for cement plants, built around the use cases in the
"Smart Cement Manufacturing Facility" reference document: bag filter dust monitoring, smart
control centre management, 3D stock management, predictive maintenance, kiln & energy
optimization, quality prediction, worker safety, and emissions & carbon tracking.

Only **Bag Filter Dust Monitoring** the document's recommended rollout entry point is
fully interactive today, with live simulated sensor data, an emission trend chart against
the regulatory limit, and predictive alerts. 

The other 7 modules are scaffolded in the
navigation as content rich preview pages (What it is / Advantages / Disadvantages / Bottom
line), ready to be built out the same way in a later phase.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App), React Router v6, Tailwind CSS 3, Chart.js 4 |
| Backend | Node.js, Express |
| Auth | JWT + bcryptjs, in-memory demo users |
| Data | In-memory simulation engine, polled by the client every ~10-12s |

---

## Project structure

```
server/
  data/            # in-memory users, bag filter state, alerts store
  services/        # simulation loop (random-walks sensor readings, raises alerts)
  middleware/       # JWT auth middleware
  routes/          # auth, dashboard, bagfilter, health
  index.js         # Express app entrypoint

client/
  src/
    App.js                     # routing + auth gating
    services/
      auth.js                  # AuthProvider / useAuth
      api.js                   # REST calls to the backend
      socket.js                # polling DataContext (kept filename for compatibility)
      cementKnowledge.js       # module content, plant zones, RBAC roles, audit log seed
    components/
      Layout.js                # sidebar, topbar, alert/advisory panels
      RequireAuth.js           # route guard
      KPICard.js, AlertPanel.js, AdvisoryPanel.js, ZoneFilterBar.js, chartUtils.js
    pages/
      Login.js
      Dashboard.js              # plant-wide overview
      BagFilterMonitoring.js    # fully interactive module
      ModulePlaceholder.js      # shared page for the 7 preview modules
      Compliance.js             # compliance & emissions audit
```

---

## Quick start

```bash
# From the project root
npm run install:all

# Copy env templates
cp server/.env.example server/.env
cp client/.env.example client/.env

# Start both the API (port 4000) and the client (port 3000)
npm run dev
```

Then open http://localhost:3000 — you'll be redirected to `/login`.

### Demo credentials

All demo accounts share the password `Astrikos2026`. Log in with the **username** (not email).

| Role | Username | Email (alternate login) |
|---|---|---|
| Plant Administrator | admin | admin@cempulse.demo |
| Control Room Operator | operator | operator@cempulse.demo |
| Maintenance Engineer | maintenance | maintenance@cempulse.demo |
| HSE / Safety Officer | hse | hse@cempulse.demo |

The login page has one-click buttons to fill any of these in.

---

## API

All `/api/dashboard/*` and `/api/bagfilter/*` routes require a `Authorization: Bearer <token>`
header obtained from `POST /api/auth/login`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` (email also accepted) → `{ token, user }` |
| GET | `/api/auth/me` | current user from the bearer token |
| GET | `/api/dashboard/summary` | plant-wide KPIs, investment/payback figures, alert counts |
| GET | `/api/bagfilter/status` | live compartment readings + rolling history |
| GET | `/api/bagfilter/alerts` | predictive/critical bag filter alerts |
| POST | `/api/bagfilter/alerts/:id/ack` | acknowledge an alert |
| GET | `/api/health` | uptime check |

---

## Notes

- Readings/alerts/metrics live entirely in memory (`server/db/pg-index.js`) — there is no
  database to provision or migrate. On boot the server seeds 30 days of demo history
  (`server/db/seedDemoHistory.js`) so dashboards and KPIs show real values immediately.
  Each in-memory collection is capped (e.g. last 20,000 rows) so memory usage stays bounded;
  restarting the server resets state back to a fresh seeded history.
- The simulation random-walks compartment readings and raises alerts when differential
  pressure, acoustic index, or emissions cross the thresholds defined in
  `server/services/simulation.js`.
- To add a new fully-interactive module, follow the `BagFilterMonitoring.js` pattern: a
  backend route + simulation source, a client page, and a route in `App.js`.

---

## Deploying (single Node app, e.g. Hostinger)

In production the Express server also serves the built React app, so the whole site is one
Node process — no separate static host needed.

1. **Node.js hosting panel** (e.g. Hostinger hPanel → "Setup Node.js App"):
   - Application root: repo root (this folder)
   - Application startup file: `server/index.js`
   - Node version: any LTS release (18, 20, or 22) — there are no native modules to compile
2. Set environment variables in the panel: `JWT_SECRET` (required), `JWT_EXPIRES_IN`
   (optional, defaults to `8h`), `CORS_ORIGIN` (optional). Don't set `PORT` — the host
   assigns it. No database is needed.
3. Client build config: `client/.env.production` sets `REACT_APP_API_URL=/api` (a relative
   path) so the deployed build calls the API on the same origin it's served from — no need
   to hardcode a domain. Only change this if the API is deployed on a different origin than
   the static frontend.
4. Click **Run NPM Install** in the panel. This triggers the root `postinstall` script,
   which installs both `server/` and `client/` dependencies and runs the client's
   production build automatically (`npm run build`) — no manual build step needed.
5. Start/restart the app. It seeds its in-memory demo history on boot, then serves the
   API under `/api/*` and the React app for every other route from the same domain and port.

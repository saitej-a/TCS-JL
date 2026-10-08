# TCS Joining Tracker — Frontend

The SPA for the TCS Joining Tracker platform: Vite + React 18 + TypeScript
(strict) + Tailwind CSS v4, per Phase 9.1's decisions (`.planning/phases/TCS-JL-09.1-spa-foundation-and-api-client/09.1-CONTEXT.md`).

## Quick start

```bash
cd frontend
npm install
npm run dev
```

The dev server listens on **http://localhost:5173** (`strictPort` — the port is
part of the topology).

### API proxy

The Vite dev server and production build preview proxy these paths to
`https://tcsjl-backend.bond`:

| Path | Proxied to | Why |
|---|---|---|
| `/api` | `https://tcsjl-backend.bond` | All API traffic (`/api/v1/...`) |
| `/admin` | `https://tcsjl-backend.bond` | Django admin |
| `/static` | `https://tcsjl-backend.bond` | Static assets |
| `/media` | `https://tcsjl-backend.bond` | Uploaded media |

The Vite proxy accepts the backend's TLS certificate for proxied requests.
This setting applies only to Vite's server-side proxy; browsers still enforce
TLS validation for direct production API requests.

### API base URL

`src/api/client.ts` reads `VITE_API_BASE_URL` — the only module that touches
this env var. Local development defaults to `/api/v1` and uses the Vite proxy;
production defaults to `https://tcsjl-backend.bond/api/v1`. Set
`VITE_API_BASE_URL` to an absolute API URL in Vercel only if overriding that
default; relative values such as `/api/v1` are ignored in production to prevent
requests from going to the frontend host. Vite embeds this value at build time,
so redeploy after changing it. Chat WebSockets use the same host as the API.

For Vercel, set the project's **Root Directory** to `frontend`. The
`frontend/vercel.json` rewrite sends SPA routes (including verification-email
links) to `index.html`; without it, opening a link such as
`/verify-email/<token>` directly returns Vercel's 404. Set the backend's
`FRONTEND_URL` to the deployed frontend origin so verification emails link to
the right site.

### Firebase Cloud Messaging (browser push)

Copy `firebase.env.example` to `.env.production` and set
`VITE_FIREBASE_VAPID_KEY` to the Web Push certificate public key from Firebase
Console → Project settings → Cloud Messaging. The other `VITE_FIREBASE_*`
values are the Firebase web-app configuration. They are embedded in the SPA at
build time; set them before `npm run build` (Vite preview uses the same built
configuration).

Production `docker-compose.prod.yml` runs FCM delivery through Django/Celery.
Place the Firebase Admin service-account JSON at
`secrets/firebase-service-account.json`; it is mounted read-only into the API
and worker containers and must never be committed. The browser FCM token is
stored as a `FIREBASE_WEB` device, distinct from legacy `WEB` Web Push
subscriptions. Apply the notifications migration when deploying.
The frontend refreshes the registered FCM token on authenticated visits after
notification permission has already been granted; it does not prompt again.

For Render service setup and the separate Render-oriented Compose file, see
[`../RENDER_DEPLOYMENT.md`](../RENDER_DEPLOYMENT.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :5173 with the API proxy |
| `npm run lint` | ESLint (typescript-eslint + react-hooks + react-refresh) |
| `npm run typecheck` | `tsc --noEmit` (strict; no `any` anywhere) |
| `npm run test:run` | Vitest + RTL, headless |
| `npm run test` | Vitest in watch mode |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |

Run them all (the phase gate): `npm run lint && npm run typecheck && npm run test:run && npm run build`.

## Design tokens

`src/index.css` is the token layer: the `@theme` block transcribes 05 §4.1's
palette (brand scale + semantic aliases) and the `.dark` override flips the
same custom properties. Component-facing constants (typography roles, surface
classes) live in `src/theme/tokens.ts`; category/status badge maps live in
`src/theme/badges.ts`. See **05_UI_UX_SPECIFICATION.md §4** for the source of
truth — components never invent hex values or spacing.

## Architecture notes

- **History-mode routing** (`createBrowserRouter`) is live from 9.1. Whatever
  serves `dist/` in production must rewrite unknown paths to `index.html`
  (nginx `try_files ... /index.html` or the Vercel rewrite above) or deep links
  404 — recorded as an open item (9.1 D4).
- **Token storage** follows 06 §3.3 Option 1: the access token is memory-only;
  the refresh token sits in `localStorage` under one namespaced key and is
  blacklisted server-side on logout. The 401 path is a single-flight refresh
  with one bounded replay (see `src/api/client.ts`).

# Render deployment notes

`docker-compose.render.yml` is a separate, external-database Compose topology
for local validation or Docker hosts. It does not change
`docker-compose.prod.yml`. Render deploys individual services and does not
deploy a Compose file directly; create Render services from this repository
and use the Dockerfile plus the matching service start commands below.

## Render services

Create a Docker web service for the API and two Docker background workers from
the repository root. Use the existing root `Dockerfile` for each:

| Render service | Start command |
| --- | --- |
| API web service | `/app/docker/entrypoint.sh gunicorn config.wsgi:application --bind 0.0.0.0:10000 --workers 4 --threads 2 --timeout 60 --access-logfile -` |
| ASGI web service (WebSockets) | `/app/docker/entrypoint.sh daphne -b 0.0.0.0 -p 10000 config.asgi:application` |
| Celery background worker | `/app/docker/entrypoint.sh celery -A config worker --loglevel=INFO --concurrency=2 -Q default,notifications,maintenance` |
| Celery Beat background worker | `/app/docker/entrypoint.sh celery -A config beat --loglevel=INFO` |

For both web services, set the health-check path to `/health/ready/` and the
application port to `10000`. Render provides external HTTPS; do not add the
Compose nginx container in front of Render's web service.

Attach a managed PostgreSQL database and a Redis-compatible service. Set these
environment variables on each service:

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DJANGO_SECRET_KEY` (a unique generated secret)
- `DJANGO_ALLOWED_HOSTS` (include the API's `*.onrender.com` hostname)
- `DATABASE_URL` (PostgreSQL connection string with `sslmode=require` if required)
- `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND` (the managed
  Redis connection string)
- `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` (the
  deployed frontend's HTTPS origin)
- `RUN_DB_MIGRATIONS=1` on the API web service only

Configure SMTP variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`,
`EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`) only when testing actual email delivery.
Otherwise production settings use the console email backend.

On the Celery worker, set `PUSH_BACKEND=firebase` and
`FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase-service-account.json`. Add
the service-account JSON as a Render secret file on the worker service (Render
mounts Docker-service secret files under `/etc/secrets/`). Do not commit or
paste its contents into environment variables. The local Compose file's
`/run/secrets/...` path is not the Render secret-file path.

Build the frontend as a Render Static Site from `frontend/`. Set the
`VITE_FIREBASE_*` configuration and `VITE_API_BASE_URL` to the API's public
HTTPS URL plus `/api/v1` **before the frontend build**. Those values are
compiled into the static assets. Rebuild after changing them.

Add a rewrite from `/*` to `/index.html` in the Static Site's Redirects/Rewrites
settings so React Router deep links work.

### Important feature limitations of this topology

- The chat client currently opens its WebSocket on the frontend's own origin.
  A separate Render Static Site cannot proxy `/ws` to a separate ASGI service,
  so real-time chat needs a frontend WebSocket URL setting or a same-origin
  reverse-proxy gateway before it will work on Render.
- Uploaded media is written to the app filesystem by default. Render container
  filesystems are not durable across deploys; use persistent/object storage
  before relying on uploaded files in production.

## Validate the Compose variant locally

Copy `.env.render.example` to `.env.render`, fill it only with disposable
staging database/Redis URLs and application settings, and put a Firebase
service-account file at `secrets/firebase-service-account.json` if exercising
push delivery. Then run from the repository root:

```powershell
docker compose --env-file .env.render -f docker-compose.render.yml config
docker compose --env-file .env.render -f docker-compose.render.yml up -d --build
docker compose --env-file .env.render -f docker-compose.render.yml ps
```

The Compose variant connects only to the database and Redis URLs supplied in
`.env.render`; it defines no local database or Redis volumes. Never point it at
a production database for preview or test runs: the API entrypoint applies
database migrations.

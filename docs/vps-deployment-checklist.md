# DCA Books Lite VPS Deployment Checklist

This checklist prepares the repo for the first safe VPS rollout on the existing Dockerized Caddy stack.

## Deployment topology

- Existing Caddy container stays in `/opt/dca`.
- Finance Lite lives in `/opt/dca/apps/finance-lite`.
- The app stack joins the external Docker network `dca_net`.
- API and PostgreSQL are internal only.
- Caddy proxies `/api/*` to `finance-lite-api:4000`.
- Frontend is built to `frontend/dist` and served by Caddy as static files.
- Persistent Docker volumes:
  - `postgres_data`
  - `uploads_data`

## Why the app ports stay closed

- Publishing the API or database on `0.0.0.0` makes them reachable outside Docker and can bypass the intended UFW perimeter.
- The base compose file keeps both services private on `dca_net`.
- If you need local host access during development, use `docker-compose.override.yml` instead of changing the production file.

## Local Docker network note

- If `dca_net` does not already exist on the local machine, create it once with:

```powershell
docker network create dca_net
```

## Environment files

- Backend runtime env: `deploy/vps.env.example`
- Frontend runtime env: `deploy/frontend.env.example`
- Caddy example: `deploy/Caddyfile.example`

## Required production values

- `NODE_ENV=production`
- `PORT=4000`
- `API_PREFIX=/api/v1`
- `LOG_LEVEL=info`
- `POSTGRES_DB=dca_books_lite`
- `POSTGRES_USER=dca_lite_user`
- `POSTGRES_DB_PASSWORD` set to a strong random password
- `DATABASE_URL=postgresql://dca_lite_user:<same password>@postgres:5432/dca_books_lite?schema=public`
- `CORS_ORIGIN=https://app.digitalcubeagency.net`
- `TRUST_PROXY_HOPS=1`
- `STORAGE_PROVIDER=LOCAL`
- `LOCAL_UPLOAD_DIR=storage/uploads`
- `ACCESS_TOKEN_SECRET` at least 32 random characters
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=lax`
- `BOOTSTRAP_TENANT_NAME=Digital Cube Agency`
- `BOOTSTRAP_TENANT_SLUG=digital-cube-agency`
- `BOOTSTRAP_ADMIN_EMAIL=admin@digitalcubeagency.net`
- `BOOTSTRAP_ALLOW_PRODUCTION=false` by default

## Secret handling

- Keep real secrets out of Git.
- Do not commit a real `BOOTSTRAP_ADMIN_PASSWORD`.
- If you paste the database password into `POSTGRES_DB_PASSWORD`, paste the same value into `DATABASE_URL` too.
- `dotenv` does not expand one env var into another inside the app, so both values must match explicitly.

## Fresh VPS flow

1. Provision the VPS and confirm Docker plus the Compose plugin are installed.
2. Clone the repository into `/opt/dca/apps/finance-lite`.
3. Create or confirm the shared network:

```powershell
docker network create dca_net
```

4. Copy `deploy/vps.env.example` to `.env` and fill in the real production values.
5. Copy `deploy/frontend.env.example` into the frontend build environment if needed.
6. Start the stack:

```powershell
docker compose up -d --build
```

7. Apply database migrations:

```powershell
docker compose exec api npx prisma migrate deploy
```

8. Build the frontend:

```powershell
cd frontend
npm.cmd install
$env:VITE_API_BASE_URL="https://app.digitalcubeagency.net"
npm.cmd run build
```

9. Mount or bind `frontend/dist` into the Caddy container at `/srv/finance-lite/frontend/dist`.
10. Verify the health endpoints through the public origin.

## Bootstrap flow

Use this only for the intentional first production bootstrap:

1. Temporarily set `BOOTSTRAP_ALLOW_PRODUCTION=true`.
2. Temporarily set `BOOTSTRAP_ADMIN_PASSWORD` to a strong one-time password.
3. Run:

```powershell
docker compose exec api node dist/scripts/bootstrap-admin.js
```

4. Set `BOOTSTRAP_ALLOW_PRODUCTION=false` again.
5. Remove or comment out `BOOTSTRAP_ADMIN_PASSWORD`.
6. Restart the API container:

```powershell
docker compose restart api
```

## Health checks

- `https://app.digitalcubeagency.net/api/v1/health/live`
- `https://app.digitalcubeagency.net/api/v1/health/ready`

Expected ready response:

- `success: true`
- database status reports `ok`

## Backup note

- Before real production data lands, configure `pg_dump` backups for PostgreSQL.
- Back up the uploads volume too.
- Google Drive remains pending and must not block staging deployment.

## Deployment checklist

- [ ] `.env` populated with production values
- [ ] `POSTGRES_DB_PASSWORD` and `DATABASE_URL` use the same password
- [ ] `DATABASE_URL` points to `postgres`
- [ ] `ACCESS_TOKEN_SECRET` is a long random value
- [ ] `COOKIE_SECURE=true` in production
- [ ] `CORS_ORIGIN` matches `https://app.digitalcubeagency.net`
- [ ] `STORAGE_PROVIDER=LOCAL` used only for staging and early validation
- [ ] `dca_net` exists and both app containers join it
- [ ] `frontend/dist` is mounted into Caddy at `/srv/finance-lite/frontend/dist`
- [ ] migrations applied with `prisma migrate deploy`
- [ ] one-time bootstrap completed with `BOOTSTRAP_ALLOW_PRODUCTION=true`
- [ ] `BOOTSTRAP_ALLOW_PRODUCTION` reset to `false`
- [ ] `BOOTSTRAP_ADMIN_PASSWORD` removed or commented out
- [ ] live health check passes
- [ ] ready health check passes
- [ ] login works with the bootstrap admin
- [ ] app loads through `https://app.digitalcubeagency.net`

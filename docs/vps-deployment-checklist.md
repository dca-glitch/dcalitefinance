# DCA Books Lite VPS Deployment Checklist

This checklist prepares the current repo for a single-owner VPS deployment.

## Current deployment posture

- Backend remains the source of truth.
- One tenant only: `Digital Cube Agency`.
- One fixed currency per tenant.
- No multicurrency.
- Local storage is acceptable for VPS staging and temporary rollout validation.
- Production document storage is still unresolved because Google Drive service-account key creation is blocked by organization policy.

## Storage decision status

- Temporary VPS staging setting: `STORAGE_PROVIDER=LOCAL`
- Temporary upload root: `LOCAL_UPLOAD_DIR=storage/uploads`
- Google Drive code stays in place.
- Google Drive production storage is pending a credential strategy:
  - organization admin allows service-account key creation, or
  - the app is extended to OAuth-based Google Drive, or
  - another production storage provider is selected.

## Recommended VPS topology

Recommended minimal setup:

- PostgreSQL on the VPS, either via Docker Compose or an external managed database.
- Backend API container built from the repository root `Dockerfile`.
- Frontend built separately with Vite and served as static files.
- Caddy or another reverse proxy serves the frontend and proxies `/api/v1/*` to the backend.

This keeps the browser on a single public origin while still allowing the backend API to stay containerized.

## Required environment files

- Backend runtime env: `deploy/vps.env.example`
- Frontend production env: `deploy/frontend.env.example`
- Reverse proxy example: `deploy/Caddyfile.example`

## Fresh VPS deployment steps

1. Provision the VPS and install Docker plus the Compose plugin.
2. Clone the repository to the VPS.
3. Copy `deploy/vps.env.example` to `.env` and fill in production values.
4. Keep `STORAGE_PROVIDER=LOCAL` for staging until the production storage strategy is chosen.
5. Build and start the backend stack.
6. Apply database migrations.
7. Build the frontend.
8. Serve `frontend/dist` from the reverse proxy.
9. Verify the health endpoints.
10. Run a login smoke test and confirm the app loads through the public origin.

## Backend deployment commands

Typical Compose-based flow:

```powershell
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
```

If the API is ever run directly on the host instead of in Docker:

```powershell
npx prisma migrate deploy
```

The repo already validates Prisma generation during container build, so the migration step is the main fresh-VPS database action.

## Frontend deployment commands

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
```

Serve the generated `frontend/dist` directory from Caddy or another static host.

## Health checks

Use these after the stack is up:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

Expected ready response:

- `success: true`
- database status reports `ok`

## Deployment checklist

- [ ] `.env` populated with production values
- [ ] `DATABASE_URL` points to the VPS database
- [ ] `ACCESS_TOKEN_SECRET` is a long random value
- [ ] `COOKIE_SECURE=true` in production
- [ ] `CORS_ORIGIN` matches the public frontend origin
- [ ] `STORAGE_PROVIDER=LOCAL` used only for staging fallback
- [ ] frontend build succeeds
- [ ] migrations applied with `prisma migrate deploy`
- [ ] live health check passes
- [ ] ready health check passes
- [ ] login works with the bootstrap admin
- [ ] app loads through the public reverse proxy

## Known pending item

Google Drive production storage remains blocked until a credential strategy is selected. Do not remove the Google Drive code path; it is still needed for the eventual production solution.

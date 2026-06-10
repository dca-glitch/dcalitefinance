# DCA Books Lite Backend — Phase 0A

Clean backend infrastructure foundation for DCA Books Lite.

## Scope

Phase 0A is infrastructure-only.

Included:

- Node.js 20
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Docker Compose
- Health endpoints
- Request ID middleware
- HTTP logging
- Central error handling
- BigInt-safe JSON helper

Not included yet:

- Auth
- Tenants
- Clients
- Invoices
- Payments
- Expenses
- Recurring invoices
- Reports
- Business endpoints
- Business database models
- Prisma migrations

## Local validation

```powershell
copy .env.example .env
npm install
npm run typecheck
npx prisma validate
docker compose config
docker compose up --build
```

Health checks:

```powershell
curl.exe http://localhost:4000/api/v1/health/live
curl.exe http://localhost:4000/api/v1/health/ready
```

Expected ready response includes database ok.

## Architecture rules carried forward

- Multi-tenant from day one in future business phases.
- Every future business record must include tenant_id.
- Backend/database are the financial source of truth.
- Frontend must not calculate financial truth.
- No hard-delete for financial records.
- Financial operations must be transactional, auditable, and recoverable.
- Money must be stored in integer minor units, not floats.
- API must serialize BigInt safely.

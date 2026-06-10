# DCA Books Lite — Phase 0D Auth Invitation Plan

## Scope

Phase 0D adds the database foundation for user invitations and later password setup/reset flows.

Implemented in GitHub in this phase:

- `AuthTokenPurpose` enum
- `auth_tokens` table
- hashed one-time auth token storage
- token expiry fields
- token consumed/revoked fields
- tenant-bound invitation token support
- audit enum values for password setup and reset events

## Security rules

- Store only hashes of one-time tokens.
- Never store raw invitation or reset tokens in the database.
- Invitation tokens are single-use.
- Password setup must activate invited users only through a valid unconsumed token.
- Password setup must increment `token_version` and revoke active sessions.
- Tenant membership must move from `INVITED` to `ACTIVE` only after successful setup.
- Existing active users may be added to a tenant without changing their password.
- Tenant ID must come from authenticated tenant context, not request body.

## Deferred code path

The GitHub connector blocked direct service-code commits for token/password handling. The database migration is committed safely. The next implementation step should be local replacement files followed by local validation and Git push.

## Validation checklist

- `git pull`
- `npx prisma validate`
- run Phase 0D migration against local database
- `npx prisma generate`
- `npm run typecheck`
- `npm audit`
- Docker rebuild
- health live/ready checks

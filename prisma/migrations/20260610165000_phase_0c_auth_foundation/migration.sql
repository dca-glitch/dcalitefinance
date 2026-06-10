-- Phase 0C auth foundation

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TOKEN_REFRESH';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TOKEN_REUSE_DETECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOTSTRAP_ADMIN';

ALTER TABLE "users"
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "password_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_login_at" TIMESTAMPTZ(6),
  ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "user_agent" VARCHAR(500),
  "ip_address" VARCHAR(80),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "replaced_by_id" UUID,
  "revoked_by_id" UUID,
  "revocation_reason" VARCHAR(50),
  "last_used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");
CREATE INDEX "user_sessions_user_id_revoked_at_expires_at_idx" ON "user_sessions"("user_id", "revoked_at", "expires_at");
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
CREATE INDEX "user_sessions_replaced_by_id_idx" ON "user_sessions"("replaced_by_id");
CREATE INDEX "user_sessions_revoked_by_id_idx" ON "user_sessions"("revoked_by_id");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

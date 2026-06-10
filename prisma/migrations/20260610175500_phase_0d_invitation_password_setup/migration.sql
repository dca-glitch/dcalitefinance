-- Phase 0D invitation and password setup foundation

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_SETUP';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_REQUEST';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_CONFIRM';

CREATE TYPE "AuthTokenPurpose" AS ENUM ('INVITATION_SETUP', 'PASSWORD_RESET');

CREATE TABLE "auth_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "tenant_id" UUID,
  "purpose" "AuthTokenPurpose" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_user_id_purpose_consumed_at_revoked_at_expires_at_idx" ON "auth_tokens"("user_id", "purpose", "consumed_at", "revoked_at", "expires_at");
CREATE INDEX "auth_tokens_tenant_id_purpose_created_at_idx" ON "auth_tokens"("tenant_id", "purpose", "created_at");
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

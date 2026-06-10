-- Phase 1 clients module

CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

CREATE TABLE "clients" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "email" CITEXT,
  "phone" VARCHAR(40),
  "website" VARCHAR(200),
  "tax_id" VARCHAR(80),
  "billing_address_line1" VARCHAR(160),
  "billing_address_line2" VARCHAR(160),
  "billing_city" VARCHAR(120),
  "billing_state" VARCHAR(120),
  "billing_postal_code" VARCHAR(40),
  "billing_country" VARCHAR(120),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_tenant_id_status_deleted_at_idx" ON "clients"("tenant_id", "status", "deleted_at");
CREATE INDEX "clients_tenant_id_name_idx" ON "clients"("tenant_id", "name");
CREATE INDEX "clients_tenant_id_email_idx" ON "clients"("tenant_id", "email");

ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

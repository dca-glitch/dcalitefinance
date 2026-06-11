-- Phase 6 payments foundation

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PAID';

CREATE TYPE "PaymentStatus" AS ENUM ('POSTED', 'REVERSED');

ALTER TABLE "invoices"
  ADD COLUMN "paid_amount_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "balance_due_minor" INTEGER NOT NULL DEFAULT 0;

UPDATE "invoices"
SET "paid_amount_minor" = 0,
    "balance_due_minor" = "total_minor";

CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "payment_date" DATE NOT NULL,
  "method" VARCHAR(80) NOT NULL,
  "reference" VARCHAR(120),
  "notes" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'POSTED',
  "reversed_at" TIMESTAMPTZ(6),
  "reversal_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payments_tenant_id_invoice_id_idx" ON "payments"("tenant_id", "invoice_id");
CREATE INDEX "payments_tenant_id_invoice_id_status_idx" ON "payments"("tenant_id", "invoice_id", "status");
CREATE INDEX "payments_tenant_id_payment_date_idx" ON "payments"("tenant_id", "payment_date");
CREATE INDEX "payments_tenant_id_status_reversed_at_idx" ON "payments"("tenant_id", "status", "reversed_at");

ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

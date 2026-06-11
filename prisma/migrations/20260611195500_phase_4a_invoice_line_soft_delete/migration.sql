-- Phase 4A invoice line soft-delete hardening

ALTER TABLE "invoice_lines"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX "invoice_lines_tenant_id_invoice_id_deleted_at_idx"
  ON "invoice_lines"("tenant_id", "invoice_id", "deleted_at");

-- Phase 4 invoice foundation

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ARCHIVED');

CREATE TABLE "invoice_sequences" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_year" INTEGER NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "client_id" UUID,
  "project_id" UUID,
  "invoice_number" VARCHAR(40) NOT NULL,
  "invoice_year" INTEGER NOT NULL,
  "invoice_sequence" INTEGER NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issue_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "notes" TEXT,
  "terms" TEXT,
  "subtotal_minor" INTEGER NOT NULL,
  "total_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_lines" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "service_item_id" UUID,
  "line_number" INTEGER NOT NULL,
  "description" VARCHAR(300) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_sequences_tenant_id_invoice_year_key" ON "invoice_sequences"("tenant_id", "invoice_year");
CREATE INDEX "invoice_sequences_tenant_id_invoice_year_idx" ON "invoice_sequences"("tenant_id", "invoice_year");

CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_year_invoice_sequence_key" ON "invoices"("tenant_id", "invoice_year", "invoice_sequence");
CREATE INDEX "invoices_tenant_id_status_deleted_at_idx" ON "invoices"("tenant_id", "status", "deleted_at");
CREATE INDEX "invoices_tenant_id_issue_date_idx" ON "invoices"("tenant_id", "issue_date");
CREATE INDEX "invoices_tenant_id_client_id_deleted_at_idx" ON "invoices"("tenant_id", "client_id", "deleted_at");
CREATE INDEX "invoices_tenant_id_project_id_deleted_at_idx" ON "invoices"("tenant_id", "project_id", "deleted_at");

CREATE INDEX "invoice_lines_tenant_id_invoice_id_idx" ON "invoice_lines"("tenant_id", "invoice_id");
CREATE INDEX "invoice_lines_tenant_id_service_item_id_idx" ON "invoice_lines"("tenant_id", "service_item_id");
CREATE INDEX "invoice_lines_tenant_id_invoice_id_line_number_idx" ON "invoice_lines"("tenant_id", "invoice_id", "line_number");

ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

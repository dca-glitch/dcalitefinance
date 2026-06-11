-- CreateEnum
CREATE TYPE "FileAttachmentEntityType" AS ENUM ('PAYMENT', 'BILL');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'GOOGLE_DRIVE');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecurringInvoiceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecurringInvoiceFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringInvoiceRunStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoice_sequences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
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
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID,
    "category_id" UUID,
    "bill_number" VARCHAR(40),
    "bill_date" DATE NOT NULL,
    "due_date" DATE,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "amount_minor" INTEGER NOT NULL,
    "paid_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "balance_due_minor" INTEGER NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(80),
    "payment_reference" VARCHAR(120),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" "FileAttachmentEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "stored_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_provider" "StorageProvider" NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "checksum_sha256" VARCHAR(64),
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID,
    "project_id" UUID,
    "status" "RecurringInvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "RecurringInvoiceFrequency" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "next_run_date" DATE NOT NULL,
    "last_run_date" DATE,
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recurring_invoice_id" UUID NOT NULL,
    "service_item_id" UUID,
    "line_number" INTEGER NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "line_total_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recurring_invoice_id" UUID NOT NULL,
    "scheduled_for" DATE NOT NULL,
    "generated_invoice_id" UUID,
    "status" "RecurringInvoiceRunStatus" NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_invoice_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendors_tenant_id_deleted_at_idx" ON "vendors"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_name_idx" ON "vendors"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_email_idx" ON "vendors"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "expense_categories_tenant_id_deleted_at_idx" ON "expense_categories"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "expense_categories_tenant_id_name_idx" ON "expense_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "bills_tenant_id_deleted_at_idx" ON "bills"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "bills_tenant_id_status_deleted_at_idx" ON "bills"("tenant_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "bills_tenant_id_bill_date_idx" ON "bills"("tenant_id", "bill_date");

-- CreateIndex
CREATE INDEX "bills_tenant_id_vendor_id_deleted_at_idx" ON "bills"("tenant_id", "vendor_id", "deleted_at");

-- CreateIndex
CREATE INDEX "bills_tenant_id_category_id_deleted_at_idx" ON "bills"("tenant_id", "category_id", "deleted_at");

-- CreateIndex
CREATE INDEX "file_attachments_tenant_id_entity_type_entity_id_deleted_at_idx" ON "file_attachments"("tenant_id", "entity_type", "entity_id", "deleted_at");

-- CreateIndex
CREATE INDEX "file_attachments_tenant_id_storage_provider_deleted_at_idx" ON "file_attachments"("tenant_id", "storage_provider", "deleted_at");

-- CreateIndex
CREATE INDEX "file_attachments_tenant_id_uploaded_by_user_id_deleted_at_idx" ON "file_attachments"("tenant_id", "uploaded_by_user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_status_deleted_at_idx" ON "recurring_invoices"("tenant_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_next_run_date_idx" ON "recurring_invoices"("tenant_id", "next_run_date");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_client_id_deleted_at_idx" ON "recurring_invoices"("tenant_id", "client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_project_id_deleted_at_idx" ON "recurring_invoices"("tenant_id", "project_id", "deleted_at");

-- CreateIndex
CREATE INDEX "recurring_invoice_lines_tenant_id_recurring_invoice_id_idx" ON "recurring_invoice_lines"("tenant_id", "recurring_invoice_id");

-- CreateIndex
CREATE INDEX "recurring_invoice_lines_tenant_id_recurring_invoice_id_line_idx" ON "recurring_invoice_lines"("tenant_id", "recurring_invoice_id", "line_number");

-- CreateIndex
CREATE INDEX "recurring_invoice_lines_tenant_id_service_item_id_idx" ON "recurring_invoice_lines"("tenant_id", "service_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_invoice_runs_idempotency_key_key" ON "recurring_invoice_runs"("idempotency_key");

-- CreateIndex
CREATE INDEX "recurring_invoice_runs_tenant_id_recurring_invoice_id_idx" ON "recurring_invoice_runs"("tenant_id", "recurring_invoice_id");

-- CreateIndex
CREATE INDEX "recurring_invoice_runs_tenant_id_status_idx" ON "recurring_invoice_runs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "recurring_invoice_runs_tenant_id_scheduled_for_idx" ON "recurring_invoice_runs"("tenant_id", "scheduled_for");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_lines" ADD CONSTRAINT "recurring_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_lines" ADD CONSTRAINT "recurring_invoice_lines_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "recurring_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_lines" ADD CONSTRAINT "recurring_invoice_lines_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_runs" ADD CONSTRAINT "recurring_invoice_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_runs" ADD CONSTRAINT "recurring_invoice_runs_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "recurring_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_runs" ADD CONSTRAINT "recurring_invoice_runs_generated_invoice_id_fkey" FOREIGN KEY ("generated_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;


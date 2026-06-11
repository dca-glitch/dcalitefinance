-- AlterEnum
ALTER TYPE "FileAttachmentEntityType" ADD VALUE 'INVOICE';

-- AlterTable
ALTER TABLE "file_attachments" ADD COLUMN     "google_drive_file_id" VARCHAR(120),
ADD COLUMN     "google_drive_web_content_link" VARCHAR(1000),
ADD COLUMN     "google_drive_web_view_link" VARCHAR(1000);

-- CreateTable
CREATE TABLE "tenant_issuer_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "issuer_display_name" VARCHAR(160) NOT NULL,
    "issuer_legal_name" VARCHAR(200),
    "address_line1" VARCHAR(160),
    "address_line2" VARCHAR(160),
    "city" VARCHAR(120),
    "state" VARCHAR(120),
    "postal_code" VARCHAR(40),
    "country" VARCHAR(120),
    "email" CITEXT,
    "phone" VARCHAR(40),
    "website" VARCHAR(200),
    "tax_id" VARCHAR(80),
    "company_registration_number" VARCHAR(80),
    "currency_code" CHAR(3) NOT NULL,
    "default_invoice_terms" TEXT,
    "default_payment_instructions" TEXT,
    "bank_account_name" VARCHAR(160),
    "bank_name" VARCHAR(160),
    "bank_account_number" VARCHAR(120),
    "bank_swift" VARCHAR(40),
    "invoice_footer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_issuer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_issuer_profiles_tenant_id_key" ON "tenant_issuer_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_issuer_profiles_tenant_id_idx" ON "tenant_issuer_profiles"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_issuer_profiles" ADD CONSTRAINT "tenant_issuer_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

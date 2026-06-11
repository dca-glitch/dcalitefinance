-- Phase 3 services / items catalog

CREATE TABLE "service_items" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "unit_price_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_items_tenant_id_deleted_at_idx" ON "service_items"("tenant_id", "deleted_at");
CREATE INDEX "service_items_tenant_id_name_idx" ON "service_items"("tenant_id", "name");
CREATE INDEX "service_items_tenant_id_unit_price_minor_idx" ON "service_items"("tenant_id", "unit_price_minor");

ALTER TABLE "service_items" ADD CONSTRAINT "service_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 2 projects module

CREATE TABLE "projects" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "client_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_tenant_id_deleted_at_idx" ON "projects"("tenant_id", "deleted_at");
CREATE INDEX "projects_tenant_id_name_idx" ON "projects"("tenant_id", "name");
CREATE INDEX "projects_tenant_id_client_id_deleted_at_idx" ON "projects"("tenant_id", "client_id", "deleted_at");

ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

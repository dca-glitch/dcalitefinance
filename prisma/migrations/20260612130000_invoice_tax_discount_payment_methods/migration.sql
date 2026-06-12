-- Add invoice tax and discount totals
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "tax_rate_basis_points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount_minor" INTEGER NOT NULL DEFAULT 0;

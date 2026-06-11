-- Phase 5 invoice lifecycle

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

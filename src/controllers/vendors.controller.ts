import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  archiveVendor as archiveVendorService,
  createVendor as createVendorService,
  getVendor as getVendorService,
  listVendors as listVendorsService,
  updateVendor as updateVendorService,
} from '../services/vendors.service';

const vendorIdSchema = z.string().uuid();

const listVendorsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const vendorBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  website: z.string().trim().url().max(200).nullable().optional(),
  taxId: z.string().trim().min(1).max(80).nullable().optional(),
  billingAddressLine1: z.string().trim().min(1).max(160).nullable().optional(),
  billingAddressLine2: z.string().trim().min(1).max(160).nullable().optional(),
  billingCity: z.string().trim().min(1).max(120).nullable().optional(),
  billingState: z.string().trim().min(1).max(120).nullable().optional(),
  billingPostalCode: z.string().trim().min(1).max(40).nullable().optional(),
  billingCountry: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
});

function requireAuthAndTenant(req: Request): { userId: string; tenantId: string } {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  if (!req.tenant) {
    throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
  }

  return {
    userId: req.auth.userId,
    tenantId: req.tenant.id,
  };
}

export async function listVendorsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listVendorsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid vendor query', 400, 'INVALID_VENDOR_QUERY');
  }

  const result = await listVendorsService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(toJsonSafe({ success: true, data: result }));
}

export async function getVendorHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const vendorId = vendorIdSchema.parse(req.params.vendorId);
  const vendor = await getVendorService({ tenantId: context.tenantId, vendorId });
  res.status(200).json(toJsonSafe({ success: true, data: { vendor } }));
}

export async function createVendorHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = vendorBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid vendor payload', 400, 'INVALID_VENDOR_PAYLOAD');
  }

  const vendor = await createVendorService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    name: parsed.data.name,
    email: parsed.data.email ?? undefined,
    phone: parsed.data.phone ?? undefined,
    website: parsed.data.website ?? undefined,
    taxId: parsed.data.taxId ?? undefined,
    billingAddressLine1: parsed.data.billingAddressLine1 ?? undefined,
    billingAddressLine2: parsed.data.billingAddressLine2 ?? undefined,
    billingCity: parsed.data.billingCity ?? undefined,
    billingState: parsed.data.billingState ?? undefined,
    billingPostalCode: parsed.data.billingPostalCode ?? undefined,
    billingCountry: parsed.data.billingCountry ?? undefined,
    notes: parsed.data.notes ?? undefined,
  });

  res.status(201).json(toJsonSafe({ success: true, data: { vendor } }));
}

export async function updateVendorHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const vendorId = vendorIdSchema.parse(req.params.vendorId);
  const parsed = vendorBodySchema.partial().safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid vendor update payload', 400, 'INVALID_VENDOR_UPDATE_PAYLOAD');
  }

  const vendor = await updateVendorService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    vendorId,
    name: parsed.data.name,
    email: parsed.data.email ?? undefined,
    phone: parsed.data.phone ?? undefined,
    website: parsed.data.website ?? undefined,
    taxId: parsed.data.taxId ?? undefined,
    billingAddressLine1: parsed.data.billingAddressLine1 ?? undefined,
    billingAddressLine2: parsed.data.billingAddressLine2 ?? undefined,
    billingCity: parsed.data.billingCity ?? undefined,
    billingState: parsed.data.billingState ?? undefined,
    billingPostalCode: parsed.data.billingPostalCode ?? undefined,
    billingCountry: parsed.data.billingCountry ?? undefined,
    notes: parsed.data.notes ?? undefined,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { vendor } }));
}

export async function archiveVendorHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const vendorId = vendorIdSchema.parse(req.params.vendorId);
  const vendor = await archiveVendorService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    vendorId,
    request: req,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { vendor } }));
}

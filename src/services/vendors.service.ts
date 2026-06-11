import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeVendorResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListVendorsInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateVendorInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  notes?: string | null;
}

export interface UpdateVendorInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  vendorId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  notes?: string | null;
}

export interface VendorListResult {
  vendors: SafeVendorResponse[];
  page: number;
  limit: number;
  total: number;
}

const vendorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  website: true,
  taxId: true,
  billingAddressLine1: true,
  billingAddressLine2: true,
  billingCity: true,
  billingState: true,
  billingPostalCode: true,
  billingCountry: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.VendorSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapVendor(vendor: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeVendorResponse {
  return vendor;
}

function vendorNotFoundError(): AppError {
  return new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
}

function buildVendorWhere(input: Pick<ListVendorsInput, 'tenantId' | 'search'>): Prisma.VendorWhereInput {
  const where: Prisma.VendorWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { website: { contains: search, mode: 'insensitive' } },
      { taxId: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function vendorChangeData(input: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  notes?: string | null;
}): Prisma.VendorUpdateInput {
  const data: Prisma.VendorUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = normalizeOptionalText(input.email);
  if (input.phone !== undefined) data.phone = normalizeOptionalText(input.phone);
  if (input.website !== undefined) data.website = normalizeOptionalText(input.website);
  if (input.taxId !== undefined) data.taxId = normalizeOptionalText(input.taxId);
  if (input.billingAddressLine1 !== undefined) data.billingAddressLine1 = normalizeOptionalText(input.billingAddressLine1);
  if (input.billingAddressLine2 !== undefined) data.billingAddressLine2 = normalizeOptionalText(input.billingAddressLine2);
  if (input.billingCity !== undefined) data.billingCity = normalizeOptionalText(input.billingCity);
  if (input.billingState !== undefined) data.billingState = normalizeOptionalText(input.billingState);
  if (input.billingPostalCode !== undefined) data.billingPostalCode = normalizeOptionalText(input.billingPostalCode);
  if (input.billingCountry !== undefined) data.billingCountry = normalizeOptionalText(input.billingCountry);
  if (input.notes !== undefined) data.notes = normalizeOptionalText(input.notes);

  return data;
}

export async function listVendors(input: ListVendorsInput): Promise<VendorListResult> {
  const where = buildVendorWhere(input);

  const [total, vendors] = await prisma.$transaction([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      select: vendorSelect,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    vendors: vendors.map(mapVendor),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getVendor(input: { tenantId: string; vendorId: string }): Promise<SafeVendorResponse> {
  const vendor = await prisma.vendor.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.vendorId,
      deletedAt: null,
    },
    select: vendorSelect,
  });

  if (!vendor) {
    throw vendorNotFoundError();
  }

  return mapVendor(vendor);
}

export async function createVendor(input: CreateVendorInput): Promise<SafeVendorResponse> {
  const vendor = await prisma.vendor.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      email: normalizeOptionalText(input.email),
      phone: normalizeOptionalText(input.phone),
      website: normalizeOptionalText(input.website),
      taxId: normalizeOptionalText(input.taxId),
      billingAddressLine1: normalizeOptionalText(input.billingAddressLine1),
      billingAddressLine2: normalizeOptionalText(input.billingAddressLine2),
      billingCity: normalizeOptionalText(input.billingCity),
      billingState: normalizeOptionalText(input.billingState),
      billingPostalCode: normalizeOptionalText(input.billingPostalCode),
      billingCountry: normalizeOptionalText(input.billingCountry),
      notes: normalizeOptionalText(input.notes),
    },
    select: vendorSelect,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Vendor',
    entityId: vendor.id,
    metadata: {
      vendorId: vendor.id,
      name: vendor.name,
    } satisfies Prisma.InputJsonValue,
  });

  return mapVendor(vendor);
}

export async function updateVendor(input: UpdateVendorInput): Promise<SafeVendorResponse> {
  const data = vendorChangeData({
    name: input.name,
    email: input.email,
    phone: input.phone,
    website: input.website,
    taxId: input.taxId,
    billingAddressLine1: input.billingAddressLine1,
    billingAddressLine2: input.billingAddressLine2,
    billingCity: input.billingCity,
    billingState: input.billingState,
    billingPostalCode: input.billingPostalCode,
    billingCountry: input.billingCountry,
    notes: input.notes,
  });

  if (Object.keys(data).length === 0) {
    throw new AppError('No vendor fields to update', 400, 'NO_VENDOR_FIELDS_TO_UPDATE');
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const existing = await tx.vendor.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.vendorId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw vendorNotFoundError();
    }

    return tx.vendor.update({
      where: { id: existing.id },
      data,
      select: vendorSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Vendor',
    entityId: vendor.id,
    metadata: {
      vendorId: vendor.id,
      changedFields: Object.keys(data),
    } satisfies Prisma.InputJsonValue,
  });

  return mapVendor(vendor);
}

export async function archiveVendor(input: {
  tenantId: string;
  actorUserId: string;
  vendorId: string;
  request: Request;
}): Promise<SafeVendorResponse> {
  const now = new Date();

  const vendor = await prisma.$transaction(async (tx) => {
    const existing = await tx.vendor.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.vendorId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw vendorNotFoundError();
    }

    return tx.vendor.update({
      where: { id: existing.id },
      data: {
        deletedAt: now,
      },
      select: vendorSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Vendor',
    entityId: vendor.id,
    metadata: {
      vendorId: vendor.id,
    } satisfies Prisma.InputJsonValue,
  });

  return mapVendor(vendor);
}

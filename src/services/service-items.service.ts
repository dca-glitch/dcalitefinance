import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeServiceItemResponse {
  id: string;
  name: string;
  description: string | null;
  unitPriceMinor: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListServiceItemsInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateServiceItemInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  name: string;
  unitPriceMinor: number;
  description?: string | null;
}

export interface UpdateServiceItemInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  serviceItemId: string;
  name?: string;
  unitPriceMinor?: number;
  description?: string | null;
}

export interface ServiceItemListResult {
  serviceItems: SafeServiceItemResponse[];
  page: number;
  limit: number;
  total: number;
}

const serviceItemSelect = {
  id: true,
  name: true,
  description: true,
  unitPriceMinor: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ServiceItemSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapServiceItem(serviceItem: {
  id: string;
  name: string;
  description: string | null;
  unitPriceMinor: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeServiceItemResponse {
  return {
    id: serviceItem.id,
    name: serviceItem.name,
    description: serviceItem.description,
    unitPriceMinor: serviceItem.unitPriceMinor,
    createdAt: serviceItem.createdAt,
    updatedAt: serviceItem.updatedAt,
    deletedAt: serviceItem.deletedAt,
  };
}

function serviceItemNotFoundError(): AppError {
  return new AppError('Service item not found', 404, 'SERVICE_ITEM_NOT_FOUND');
}

function buildServiceItemWhere(input: Pick<ListServiceItemsInput, 'tenantId' | 'search'>): Prisma.ServiceItemWhereInput {
  const where: Prisma.ServiceItemWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function serviceItemChangeData(input: {
  name?: string;
  unitPriceMinor?: number;
  description?: string | null;
}): Prisma.ServiceItemUpdateInput {
  const data: Prisma.ServiceItemUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.unitPriceMinor !== undefined) data.unitPriceMinor = input.unitPriceMinor;
  if (input.description !== undefined) data.description = normalizeOptionalText(input.description);

  return data;
}

export async function listServiceItems(input: ListServiceItemsInput): Promise<ServiceItemListResult> {
  const where = buildServiceItemWhere(input);

  const [total, serviceItems] = await prisma.$transaction([
    prisma.serviceItem.count({ where }),
    prisma.serviceItem.findMany({
      where,
      select: serviceItemSelect,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    serviceItems: serviceItems.map(mapServiceItem),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getServiceItem(input: { tenantId: string; serviceItemId: string }): Promise<SafeServiceItemResponse> {
  const serviceItem = await prisma.serviceItem.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.serviceItemId,
      deletedAt: null,
    },
    select: serviceItemSelect,
  });

  if (!serviceItem) {
    throw serviceItemNotFoundError();
  }

  return mapServiceItem(serviceItem);
}

export async function createServiceItem(input: CreateServiceItemInput): Promise<SafeServiceItemResponse> {
  const serviceItem = await prisma.serviceItem.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      unitPriceMinor: input.unitPriceMinor,
      description: normalizeOptionalText(input.description),
    },
    select: serviceItemSelect,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ServiceItem',
    entityId: serviceItem.id,
    metadata: {
      serviceItemId: serviceItem.id,
      name: serviceItem.name,
      unitPriceMinor: serviceItem.unitPriceMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapServiceItem(serviceItem);
}

export async function updateServiceItem(input: UpdateServiceItemInput): Promise<SafeServiceItemResponse> {
  const data = serviceItemChangeData({
    name: input.name,
    unitPriceMinor: input.unitPriceMinor,
    description: input.description,
  });

  if (Object.keys(data).length === 0) {
    throw new AppError('No service item fields to update', 400, 'NO_SERVICE_ITEM_FIELDS_TO_UPDATE');
  }

  const serviceItem = await prisma.$transaction(async (tx) => {
    const existing = await tx.serviceItem.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.serviceItemId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw serviceItemNotFoundError();
    }

    return tx.serviceItem.update({
      where: { id: existing.id },
      data,
      select: serviceItemSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ServiceItem',
    entityId: serviceItem.id,
    metadata: {
      serviceItemId: serviceItem.id,
      changedFields: Object.keys(data),
    } satisfies Prisma.InputJsonValue,
  });

  return mapServiceItem(serviceItem);
}

export async function archiveServiceItem(input: {
  tenantId: string;
  actorUserId: string;
  serviceItemId: string;
  request: Request;
}): Promise<SafeServiceItemResponse> {
  const now = new Date();

  const serviceItem = await prisma.$transaction(async (tx) => {
    const existing = await tx.serviceItem.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.serviceItemId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw serviceItemNotFoundError();
    }

    return tx.serviceItem.update({
      where: { id: existing.id },
      data: {
        deletedAt: now,
      },
      select: serviceItemSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ServiceItem',
    entityId: serviceItem.id,
    metadata: {
      serviceItemId: serviceItem.id,
      unitPriceMinor: serviceItem.unitPriceMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapServiceItem(serviceItem);
}

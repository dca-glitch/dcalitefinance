import type { Request } from 'express';
import { AuditAction, AuditActorType, ClientStatus, type Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeClientResponse {
  id: string;
  name: string;
  status: ClientStatus;
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

export interface ListClientsInput {
  tenantId: string;
  search?: string;
  status?: ClientStatus;
  page: number;
  limit: number;
}

export interface CreateClientInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  name: string;
  status?: Exclude<ClientStatus, 'ARCHIVED'>;
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

export interface UpdateClientInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  clientId: string;
  name?: string;
  status?: Exclude<ClientStatus, 'ARCHIVED'>;
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

export interface ClientListResult {
  clients: SafeClientResponse[];
  page: number;
  limit: number;
  total: number;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapClient(client: {
  id: string;
  name: string;
  status: ClientStatus;
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
}): SafeClientResponse {
  return {
    id: client.id,
    name: client.name,
    status: client.status,
    email: client.email,
    phone: client.phone,
    website: client.website,
    taxId: client.taxId,
    billingAddressLine1: client.billingAddressLine1,
    billingAddressLine2: client.billingAddressLine2,
    billingCity: client.billingCity,
    billingState: client.billingState,
    billingPostalCode: client.billingPostalCode,
    billingCountry: client.billingCountry,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    deletedAt: client.deletedAt,
  };
}

function clientNotFoundError(): AppError {
  return new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
}

function invalidClientStatusError(): AppError {
  return new AppError('Invalid client status', 400, 'INVALID_CLIENT_STATUS');
}

function buildClientWhere(input: Pick<ListClientsInput, 'tenantId' | 'search' | 'status'>): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {
    tenantId: input.tenantId,
  };

  if (input.status) {
    where.status = input.status;
    where.deletedAt = input.status === 'ARCHIVED' ? { not: null } : null;
  } else {
    where.deletedAt = null;
  }

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

function clientChangeData(input: {
  name?: string;
  status?: Exclude<ClientStatus, 'ARCHIVED'>;
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
}): Prisma.ClientUpdateInput {
  const data: Prisma.ClientUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
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

export async function listClients(input: ListClientsInput): Promise<ClientListResult> {
  const where = buildClientWhere(input);

  const [total, clients] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    clients: clients.map(mapClient),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getClient(input: { tenantId: string; clientId: string }): Promise<SafeClientResponse> {
  const client = await prisma.client.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.clientId,
      deletedAt: null,
    },
  });

  if (!client) {
    throw clientNotFoundError();
  }

  return mapClient(client);
}

export async function createClient(input: CreateClientInput): Promise<SafeClientResponse> {
  const client = await prisma.client.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      status: input.status ?? ClientStatus.ACTIVE,
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
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Client',
    entityId: client.id,
    metadata: {
      clientId: client.id,
      name: client.name,
      status: client.status,
    } satisfies Prisma.InputJsonValue,
  });

  return mapClient(client);
}

export async function updateClient(input: UpdateClientInput): Promise<SafeClientResponse> {
  const data = clientChangeData({
    name: input.name,
    status: input.status,
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
    throw new AppError('No client fields to update', 400, 'NO_CLIENT_FIELDS_TO_UPDATE');
  }

  const client = await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.clientId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw clientNotFoundError();
    }

    return tx.client.update({
      where: { id: existing.id },
      data,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Client',
    entityId: client.id,
    metadata: {
      clientId: client.id,
      changedFields: Object.keys(data),
    } satisfies Prisma.InputJsonValue,
  });

  return mapClient(client);
}

export async function deleteClient(input: {
  tenantId: string;
  actorUserId: string;
  clientId: string;
  request: Request;
}): Promise<SafeClientResponse> {
  const now = new Date();

  const client = await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.clientId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw clientNotFoundError();
    }

    return tx.client.update({
      where: { id: existing.id },
      data: {
        status: 'ARCHIVED',
        deletedAt: now,
      },
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Client',
    entityId: client.id,
    metadata: {
      clientId: client.id,
      status: client.status,
    } satisfies Prisma.InputJsonValue,
  });

  return mapClient(client);
}

export function assertEditableClientStatus(status?: ClientStatus): Exclude<ClientStatus, 'ARCHIVED'> | undefined {
  if (status === 'ARCHIVED') {
    throw invalidClientStatusError();
  }

  return status;
}

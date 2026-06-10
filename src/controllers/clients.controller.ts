import type { Request, Response } from 'express';
import { ClientStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  createClient as createClientService,
  deleteClient as deleteClientService,
  getClient as getClientService,
  listClients as listClientsService,
  updateClient as updateClientService,
  assertEditableClientStatus,
} from '../services/clients.service';

const clientStatusSchema = z.nativeEnum(ClientStatus);

const listClientsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  status: clientStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const clientIdSchema = z.string().uuid();

const clientBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  status: clientStatusSchema.optional(),
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

export async function listClientsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listClientsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid client query', 400, 'INVALID_CLIENT_QUERY');
  }

  const result = await listClientsService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    status: parsed.data.status,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}

export async function getClientHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const clientId = clientIdSchema.parse(req.params.clientId);
  const client = await getClientService({
    tenantId: context.tenantId,
    clientId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        client,
      },
    }),
  );
}

export async function createClientHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = clientBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid client payload', 400, 'INVALID_CLIENT_PAYLOAD');
  }

  const client = await createClientService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    name: parsed.data.name,
    status: assertEditableClientStatus(parsed.data.status),
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

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        client,
      },
    }),
  );
}

export async function updateClientHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const clientId = clientIdSchema.parse(req.params.clientId);
  const parsed = clientBodySchema.partial().safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid client update payload', 400, 'INVALID_CLIENT_UPDATE_PAYLOAD');
  }

  const client = await updateClientService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    clientId,
    name: parsed.data.name,
    status: parsed.data.status ? assertEditableClientStatus(parsed.data.status) : undefined,
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

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        client,
      },
    }),
  );
}

export async function deleteClientHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const clientId = clientIdSchema.parse(req.params.clientId);
  const client = await deleteClientService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    clientId,
    request: req,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        client,
      },
    }),
  );
}

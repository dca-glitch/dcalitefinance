import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  archiveServiceItem as archiveServiceItemService,
  createServiceItem as createServiceItemService,
  getServiceItem as getServiceItemService,
  listServiceItems as listServiceItemsService,
  updateServiceItem as updateServiceItemService,
} from '../services/service-items.service';

const serviceItemIdSchema = z.string().uuid();

const listServiceItemsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const serviceItemBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  unitPriceMinor: z.number().int().min(0),
  description: z.string().trim().min(1).max(5000).nullable().optional(),
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

export async function listServiceItemsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listServiceItemsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid service item query', 400, 'INVALID_SERVICE_ITEM_QUERY');
  }

  const result = await listServiceItemsService({
    tenantId: context.tenantId,
    search: parsed.data.search,
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

export async function getServiceItemHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const serviceItemId = serviceItemIdSchema.parse(req.params.serviceItemId);
  const serviceItem = await getServiceItemService({
    tenantId: context.tenantId,
    serviceItemId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        serviceItem,
      },
    }),
  );
}

export async function createServiceItemHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = serviceItemBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid service item payload', 400, 'INVALID_SERVICE_ITEM_PAYLOAD');
  }

  const serviceItem = await createServiceItemService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    name: parsed.data.name,
    unitPriceMinor: parsed.data.unitPriceMinor,
    description: parsed.data.description ?? undefined,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        serviceItem,
      },
    }),
  );
}

export async function updateServiceItemHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const serviceItemId = serviceItemIdSchema.parse(req.params.serviceItemId);
  const parsed = serviceItemBodySchema.partial().safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid service item update payload', 400, 'INVALID_SERVICE_ITEM_UPDATE_PAYLOAD');
  }

  const serviceItem = await updateServiceItemService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    serviceItemId,
    name: parsed.data.name,
    unitPriceMinor: parsed.data.unitPriceMinor,
    description: parsed.data.description,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        serviceItem,
      },
    }),
  );
}

export async function archiveServiceItemHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const serviceItemId = serviceItemIdSchema.parse(req.params.serviceItemId);
  const serviceItem = await archiveServiceItemService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    serviceItemId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        serviceItem,
      },
    }),
  );
}

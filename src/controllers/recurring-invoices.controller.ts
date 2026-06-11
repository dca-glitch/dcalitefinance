import type { Request, Response } from 'express';
import { RecurringInvoiceFrequency, RecurringInvoiceStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  archiveRecurringInvoice as archiveRecurringInvoiceService,
  createRecurringInvoice as createRecurringInvoiceService,
  generateRecurringInvoiceNow as generateRecurringInvoiceNowService,
  getRecurringInvoice as getRecurringInvoiceService,
  listRecurringInvoices as listRecurringInvoicesService,
  pauseRecurringInvoice as pauseRecurringInvoiceService,
  resumeRecurringInvoice as resumeRecurringInvoiceService,
  updateRecurringInvoice as updateRecurringInvoiceService,
} from '../services/recurring-invoices.service';

const recurringInvoiceIdSchema = z.string().uuid();

const recurringLineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPriceMinor: z.number().int().min(0),
  serviceItemId: z.string().uuid().nullable().optional(),
});

const recurringInvoiceBodySchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(RecurringInvoiceStatus).optional(),
  frequency: z.nativeEnum(RecurringInvoiceFrequency),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  nextRunDate: z.coerce.date(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
  terms: z.string().trim().min(1).max(5000).nullable().optional(),
  lines: z.array(recurringLineSchema).min(1),
});

const recurringInvoiceUpdateBodySchema = recurringInvoiceBodySchema.partial();

const listRecurringInvoicesQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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

export async function listRecurringInvoicesHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listRecurringInvoicesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid recurring invoice query', 400, 'INVALID_RECURRING_INVOICE_QUERY');
  }

  const result = await listRecurringInvoicesService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(toJsonSafe({ success: true, data: result }));
}

export async function getRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const recurringInvoice = await getRecurringInvoiceService({
    tenantId: context.tenantId,
    recurringInvoiceId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

export async function createRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = recurringInvoiceBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid recurring invoice payload', 400, 'INVALID_RECURRING_INVOICE_PAYLOAD');
  }

  const recurringInvoice = await createRecurringInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    clientId: parsed.data.clientId ?? undefined,
    projectId: parsed.data.projectId ?? undefined,
    status: parsed.data.status,
    frequency: parsed.data.frequency,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate ?? undefined,
    nextRunDate: parsed.data.nextRunDate,
    notes: parsed.data.notes ?? undefined,
    terms: parsed.data.terms ?? undefined,
    lines: parsed.data.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      serviceItemId: line.serviceItemId,
    })),
  });

  res.status(201).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

export async function updateRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const parsed = recurringInvoiceUpdateBodySchema.safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid recurring invoice update payload', 400, 'INVALID_RECURRING_INVOICE_UPDATE_PAYLOAD');
  }

  const recurringInvoice = await updateRecurringInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    recurringInvoiceId,
    clientId: parsed.data.clientId ?? undefined,
    projectId: parsed.data.projectId ?? undefined,
    status: parsed.data.status,
    frequency: parsed.data.frequency,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate ?? undefined,
    nextRunDate: parsed.data.nextRunDate,
    notes: parsed.data.notes ?? undefined,
    terms: parsed.data.terms ?? undefined,
    lines: parsed.data.lines
      ? parsed.data.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          serviceItemId: line.serviceItemId,
        }))
      : undefined,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

export async function pauseRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const recurringInvoice = await pauseRecurringInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    recurringInvoiceId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

export async function resumeRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const recurringInvoice = await resumeRecurringInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    recurringInvoiceId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

export async function generateRecurringInvoiceNowHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const result = await generateRecurringInvoiceNowService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    recurringInvoiceId,
    scheduledFor: new Date(),
  });

  res.status(200).json(toJsonSafe({ success: true, data: result }));
}

export async function archiveRecurringInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const recurringInvoiceId = recurringInvoiceIdSchema.parse(req.params.recurringInvoiceId);
  const recurringInvoice = await archiveRecurringInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    recurringInvoiceId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { recurringInvoice } }));
}

import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  createPayment as createPaymentService,
  getPayment as getPaymentService,
  listPayments as listPaymentsService,
  reversePayment as reversePaymentService,
} from '../services/payments.service';

const paymentIdSchema = z.string().uuid();

const listPaymentsQuerySchema = z.object({
  invoiceId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paymentBodySchema = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.number().int().min(1),
  paymentDate: z.coerce.date(),
  method: z.string().trim().min(1).max(80),
  reference: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
});

const paymentReverseBodySchema = z.object({
  reason: z.string().trim().min(1).max(5000).nullable().optional(),
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

export async function listPaymentsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listPaymentsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid payment query', 400, 'INVALID_PAYMENT_QUERY');
  }

  const result = await listPaymentsService({
    tenantId: context.tenantId,
    invoiceId: parsed.data.invoiceId,
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

export async function getPaymentHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const paymentId = paymentIdSchema.parse(req.params.paymentId);
  const payment = await getPaymentService({
    tenantId: context.tenantId,
    paymentId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        payment,
      },
    }),
  );
}

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = paymentBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid payment payload', 400, 'INVALID_PAYMENT_PAYLOAD');
  }

  const payment = await createPaymentService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId: parsed.data.invoiceId,
    amountMinor: parsed.data.amountMinor,
    paymentDate: parsed.data.paymentDate,
    method: parsed.data.method,
    reference: parsed.data.reference ?? undefined,
    notes: parsed.data.notes ?? undefined,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        payment,
      },
    }),
  );
}

export async function reversePaymentHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const paymentId = paymentIdSchema.parse(req.params.paymentId);
  const parsed = paymentReverseBodySchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw new AppError('Invalid payment reverse payload', 400, 'INVALID_PAYMENT_REVERSE_PAYLOAD');
  }

  const payment = await reversePaymentService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    paymentId,
    reason: parsed.data.reason,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        payment,
      },
    }),
  );
}

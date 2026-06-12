import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  cancelInvoice as cancelInvoiceService,
  archiveInvoice as archiveInvoiceService,
  createInvoice as createInvoiceService,
  getInvoice as getInvoiceService,
  issueInvoice as issueInvoiceService,
  listInvoices as listInvoicesService,
  updateInvoice as updateInvoiceService,
} from '../services/invoices.service';
import {
  generateInvoicePdf as generateInvoicePdfService,
  listInvoiceDocuments as listInvoiceDocumentsService,
} from '../services/invoice-documents.service';

const invoiceIdSchema = z.string().uuid();

const invoiceLineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPriceMinor: z.number().int().min(0),
  serviceItemId: z.string().uuid().nullable().optional(),
});

const invoiceCreateBodySchema = z
  .object({
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    clientId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().min(1).max(5000).nullable().optional(),
    terms: z.string().trim().min(1).max(5000).nullable().optional(),
    taxPercent: z.number().min(0).max(100).nullable().optional(),
    discountMinor: z.number().int().min(0).nullable().optional(),
    lines: z.array(invoiceLineSchema).min(1),
  })
  .refine((value) => value.dueDate.getTime() >= value.issueDate.getTime(), {
    message: 'Due date cannot be before issue date',
    path: ['dueDate'],
  });

const invoiceUpdateBodySchema = z.object({
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
  terms: z.string().trim().min(1).max(5000).nullable().optional(),
  taxPercent: z.number().min(0).max(100).nullable().optional(),
  discountMinor: z.number().int().min(0).nullable().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

const invoiceCancelBodySchema = z.object({
  reason: z.string().trim().min(1).max(5000).nullable().optional(),
});

const listInvoicesQuerySchema = z.object({
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

export async function listInvoicesHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listInvoicesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid invoice query', 400, 'INVALID_INVOICE_QUERY');
  }

  const result = await listInvoicesService({
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

export async function getInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const invoice = await getInvoiceService({
    tenantId: context.tenantId,
    invoiceId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function createInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = invoiceCreateBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid invoice payload', 400, 'INVALID_INVOICE_PAYLOAD');
  }

  const invoice = await createInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    issueDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
    clientId: parsed.data.clientId,
    projectId: parsed.data.projectId,
    notes: parsed.data.notes ?? undefined,
    terms: parsed.data.terms ?? undefined,
    taxPercent: parsed.data.taxPercent ?? undefined,
    discountMinor: parsed.data.discountMinor ?? undefined,
    lines: parsed.data.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      serviceItemId: line.serviceItemId,
    })),
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function issueInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const invoice = await issueInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function cancelInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const parsed = invoiceCancelBodySchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw new AppError('Invalid invoice cancel payload', 400, 'INVALID_INVOICE_CANCEL_PAYLOAD');
  }

  const invoice = await cancelInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId,
    reason: parsed.data.reason,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function updateInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const parsed = invoiceUpdateBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid invoice update payload', 400, 'INVALID_INVOICE_UPDATE_PAYLOAD');
  }

  const invoice = await updateInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId,
    issueDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
    clientId: parsed.data.clientId,
    projectId: parsed.data.projectId,
    notes: parsed.data.notes,
    terms: parsed.data.terms,
    taxPercent: parsed.data.taxPercent,
    discountMinor: parsed.data.discountMinor,
    lines: parsed.data.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      serviceItemId: line.serviceItemId,
    })),
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function archiveInvoiceHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const invoice = await archiveInvoiceService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        invoice,
      },
    }),
  );
}

export async function listInvoiceDocumentsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const documents = await listInvoiceDocumentsService({
    tenantId: context.tenantId,
    request: req,
    invoiceId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        documents,
      },
    }),
  );
}

export async function generateInvoicePdfHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const attachment = await generateInvoicePdfService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    invoiceId,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        attachment,
      },
    }),
  );
}

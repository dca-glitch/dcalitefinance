import type { Request, Response } from 'express';
import { BillStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { paymentMethodOptions } from '../constants/payment-methods';
import { toJsonSafe } from '../utils/json';
import {
  archiveBill as archiveBillService,
  createBill as createBillService,
  createBillAttachment as createBillAttachmentService,
  deleteBillAttachment as deleteBillAttachmentService,
  getBill as getBillService,
  listBillAttachments as listBillAttachmentsService,
  listBills as listBillsService,
  markBillPaid as markBillPaidService,
  voidBill as voidBillService,
  updateBill as updateBillService,
} from '../services/bills.service';

const billIdSchema = z.string().uuid();
const attachmentIdSchema = z.string().uuid();
const billStatusSchema = z.nativeEnum(BillStatus);

const listBillsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const billBodySchema = z.object({
  vendorId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  billNumber: z.string().trim().min(1).max(40).nullable().optional(),
  billDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  status: billStatusSchema.optional(),
  amountMinor: z.number().int().min(0),
  paymentMethod: z.enum(paymentMethodOptions).nullable().optional(),
  paymentReference: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
});

const billUpdateBodySchema = billBodySchema.partial();

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

export async function listBillsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listBillsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid bill query', 400, 'INVALID_BILL_QUERY');
  }

  const result = await listBillsService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(toJsonSafe({ success: true, data: result }));
}

export async function getBillHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const bill = await getBillService({ tenantId: context.tenantId, billId });
  res.status(200).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function createBillHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = billBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid bill payload', 400, 'INVALID_BILL_PAYLOAD');
  }

  const bill = await createBillService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    vendorId: parsed.data.vendorId ?? undefined,
    categoryId: parsed.data.categoryId ?? undefined,
    billNumber: parsed.data.billNumber ?? undefined,
    billDate: parsed.data.billDate,
    dueDate: parsed.data.dueDate ?? undefined,
    status: parsed.data.status,
    amountMinor: parsed.data.amountMinor,
    paymentMethod: parsed.data.paymentMethod ?? undefined,
    paymentReference: parsed.data.paymentReference ?? undefined,
    notes: parsed.data.notes ?? undefined,
  });

  res.status(201).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function updateBillHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const parsed = billUpdateBodySchema.safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid bill update payload', 400, 'INVALID_BILL_UPDATE_PAYLOAD');
  }

  const bill = await updateBillService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
    vendorId: parsed.data.vendorId ?? undefined,
    categoryId: parsed.data.categoryId ?? undefined,
    billNumber: parsed.data.billNumber ?? undefined,
    billDate: parsed.data.billDate,
    dueDate: parsed.data.dueDate ?? undefined,
    status: parsed.data.status,
    amountMinor: parsed.data.amountMinor,
    paymentMethod: parsed.data.paymentMethod ?? undefined,
    paymentReference: parsed.data.paymentReference ?? undefined,
    notes: parsed.data.notes ?? undefined,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function markBillPaidHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const bill = await markBillPaidService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function voidBillHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const bill = await voidBillService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function archiveBillHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const bill = await archiveBillService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { bill } }));
}

export async function listBillAttachmentsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const attachments = await listBillAttachmentsService({ tenantId: context.tenantId, request: req, billId });
  res.status(200).json(toJsonSafe({ success: true, data: { attachments } }));
}

export async function createBillAttachmentHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  if (!req.file) {
    throw new AppError('File is required', 400, 'FILE_REQUIRED');
  }

  const attachment = await createBillAttachmentService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
    file: req.file,
  });

  res.status(201).json(toJsonSafe({ success: true, data: { attachment } }));
}

export async function deleteBillAttachmentHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const billId = billIdSchema.parse(req.params.billId);
  const attachmentId = attachmentIdSchema.parse(req.params.attachmentId);
  const attachment = await deleteBillAttachmentService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    billId,
    attachmentId,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { attachment } }));
}

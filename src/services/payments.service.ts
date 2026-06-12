import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType, FileAttachmentEntityType, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';
import {
  deleteFileAttachment,
  listFileAttachments,
  uploadFileAttachment,
  type SafeFileAttachmentResponse,
} from './file-attachments.service';

export interface SafePaymentInvoiceResponse {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paidAmountMinor: number;
  balanceDueMinor: number;
}

export interface SafePaymentResponse {
  id: string;
  invoiceId: string;
  invoice: SafePaymentInvoiceResponse;
  amountMinor: number;
  paymentDate: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListPaymentsInput {
  tenantId: string;
  invoiceId?: string;
  page: number;
  limit: number;
}

export interface CreatePaymentInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  invoiceId: string;
  amountMinor: number;
  paymentDate: Date;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

export interface ReversePaymentInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  paymentId: string;
  reason?: string | null;
}

export interface PaymentListResult {
  payments: SafePaymentResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface PaymentAttachmentInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  paymentId: string;
  file: Express.Multer.File;
}

export interface PaymentAttachmentDeleteInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  paymentId: string;
  attachmentId: string;
}

const paymentInvoiceSelect = {
  id: true,
  invoiceNumber: true,
  status: true,
  paidAmountMinor: true,
  balanceDueMinor: true,
} satisfies Prisma.InvoiceSelect;

const paymentSelect = {
  id: true,
  invoiceId: true,
  amountMinor: true,
  paymentDate: true,
  method: true,
  reference: true,
  notes: true,
  status: true,
  reversedAt: true,
  reversalReason: true,
  createdAt: true,
  updatedAt: true,
  invoice: {
    select: paymentInvoiceSelect,
  },
} satisfies Prisma.PaymentSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function paymentNotFoundError(): AppError {
  return new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
}

function invoiceNotFoundError(): AppError {
  return new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
}

function paymentNotIssuableError(): AppError {
  return new AppError('Invoice is not payable', 400, 'INVOICE_NOT_ISSUED');
}

function invalidPaymentAmountError(): AppError {
  return new AppError('Invalid payment amount', 400, 'INVALID_PAYMENT_AMOUNT');
}

function paymentOverpaymentError(): AppError {
  return new AppError('Payment exceeds remaining balance', 400, 'PAYMENT_OVERPAYMENT');
}

function paymentAlreadyReversedError(): AppError {
  return new AppError('Payment has already been reversed', 400, 'PAYMENT_ALREADY_REVERSED');
}

function mapPaymentInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paidAmountMinor: number;
  balanceDueMinor: number;
}): SafePaymentInvoiceResponse {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    paidAmountMinor: invoice.paidAmountMinor,
    balanceDueMinor: invoice.balanceDueMinor,
  };
}

function mapPayment(payment: {
  id: string;
  invoiceId: string;
  amountMinor: number;
  paymentDate: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    paidAmountMinor: number;
    balanceDueMinor: number;
  };
}): SafePaymentResponse {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    invoice: mapPaymentInvoice(payment.invoice),
    amountMinor: payment.amountMinor,
    paymentDate: payment.paymentDate,
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    status: payment.status,
    reversedAt: payment.reversedAt,
    reversalReason: payment.reversalReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function buildPaymentWhere(input: Pick<ListPaymentsInput, 'tenantId' | 'invoiceId'>): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {
    tenantId: input.tenantId,
  };

  if (input.invoiceId) {
    where.invoiceId = input.invoiceId;
  }

  return where;
}

async function lockInvoiceForPayment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string,
  allowedStatuses: InvoiceStatus[],
): Promise<{
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalMinor: number;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      invoiceNumber: string;
      status: InvoiceStatus;
      totalMinor: number;
    }>
  >`
    SELECT
      "id",
      "invoice_number" AS "invoiceNumber",
      "status",
      "total_minor" AS "totalMinor"
    FROM "invoices"
    WHERE "tenant_id" = ${tenantId}::uuid
      AND "id" = ${invoiceId}::uuid
      AND "deleted_at" IS NULL
    FOR UPDATE
  `;
  const invoice = rows[0];

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  if (!allowedStatuses.includes(invoice.status)) {
    throw paymentNotIssuableError();
  }

  return invoice;
}

async function currentPaidAmountMinor(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string): Promise<number> {
  const aggregate = await tx.payment.aggregate({
    where: {
      tenantId,
      invoiceId,
      status: PaymentStatus.POSTED,
    },
    _sum: {
      amountMinor: true,
    },
  });

  return aggregate._sum.amountMinor ?? 0;
}

async function requirePayment(input: { tenantId: string; paymentId: string }): Promise<{ id: string; paymentDate: Date }> {
  const payment = await prisma.payment.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.paymentId,
    },
    select: {
      id: true,
      paymentDate: true,
    },
  });

  if (!payment) {
    throw paymentNotFoundError();
  }

  return payment;
}

async function recalculateInvoicePaymentState(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string): Promise<{
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paidAmountMinor: number;
  balanceDueMinor: number;
}> {
  const invoice = await tx.invoice.findFirst({
    where: {
      tenantId,
      id: invoiceId,
      deletedAt: null,
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalMinor: true,
    },
  });

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  const paidAmountMinor = await currentPaidAmountMinor(tx, tenantId, invoiceId);
  const balanceDueMinor = invoice.totalMinor - paidAmountMinor;

  if (balanceDueMinor < 0) {
    throw paymentOverpaymentError();
  }

  const status =
    paidAmountMinor === 0
      ? InvoiceStatus.ISSUED
      : balanceDueMinor === 0
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

  const updated = await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmountMinor,
      balanceDueMinor,
      status,
    },
    select: paymentInvoiceSelect,
  });

  return updated;
}

function paymentInvalidAmountCheck(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw invalidPaymentAmountError();
  }
}

export async function listPayments(input: ListPaymentsInput): Promise<PaymentListResult> {
  const where = buildPaymentWhere(input);

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    payments: payments.map(mapPayment),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getPayment(input: { tenantId: string; paymentId: string }): Promise<SafePaymentResponse> {
  const payment = await prisma.payment.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.paymentId,
    },
    select: paymentSelect,
  });

  if (!payment) {
    throw paymentNotFoundError();
  }

  return mapPayment(payment);
}

export async function createPayment(input: CreatePaymentInput): Promise<SafePaymentResponse> {
  paymentInvalidAmountCheck(input.amountMinor);

  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await lockInvoiceForPayment(tx, input.tenantId, input.invoiceId, [
      InvoiceStatus.ISSUED,
      InvoiceStatus.PARTIALLY_PAID,
    ]);
    const paidAmountMinor = await currentPaidAmountMinor(tx, input.tenantId, invoice.id);
    const remainingBalanceMinor = invoice.totalMinor - paidAmountMinor;

    if (input.amountMinor > remainingBalanceMinor) {
      throw paymentOverpaymentError();
    }

    const created = await tx.payment.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: invoice.id,
        amountMinor: input.amountMinor,
        paymentDate: input.paymentDate,
        method: input.method,
        reference: normalizeOptionalText(input.reference),
        notes: normalizeOptionalText(input.notes),
        status: PaymentStatus.POSTED,
      },
      select: paymentSelect,
    });

    await recalculateInvoicePaymentState(tx, input.tenantId, invoice.id);

    const paymentAfterUpdate = await tx.payment.findFirst({
      where: {
        tenantId: input.tenantId,
        id: created.id,
      },
      select: paymentSelect,
    });

    if (!paymentAfterUpdate) {
      throw paymentNotFoundError();
    }

    return {
      payment: paymentAfterUpdate,
    };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Payment',
    entityId: payment.payment.id,
    metadata: {
      paymentId: payment.payment.id,
      invoiceId: payment.payment.invoiceId,
      amountMinor: payment.payment.amountMinor,
      method: payment.payment.method,
      status: payment.payment.status,
    } satisfies Prisma.InputJsonValue,
  });

  return mapPayment(payment.payment);
}

export async function reversePayment(input: ReversePaymentInput): Promise<SafePaymentResponse> {
  const reason = normalizeOptionalText(input.reason);

  const payment = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.paymentId,
      },
      select: {
        id: true,
        invoiceId: true,
        amountMinor: true,
        status: true,
      },
    });

    if (!existing) {
      throw paymentNotFoundError();
    }

    await lockInvoiceForPayment(tx, input.tenantId, existing.invoiceId, [
      InvoiceStatus.ISSUED,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.PAID,
    ]);

    if (existing.status !== PaymentStatus.POSTED) {
      throw paymentAlreadyReversedError();
    }

    const reversed = await tx.payment.update({
      where: {
        id: existing.id,
      },
      data: {
        status: PaymentStatus.REVERSED,
        reversedAt: new Date(),
        reversalReason: reason,
      },
      select: paymentSelect,
    });

    await recalculateInvoicePaymentState(tx, input.tenantId, existing.invoiceId);

    const paymentAfterUpdate = await tx.payment.findFirst({
      where: {
        tenantId: input.tenantId,
        id: reversed.id,
      },
      select: paymentSelect,
    });

    if (!paymentAfterUpdate) {
      throw paymentNotFoundError();
    }

    return paymentAfterUpdate;
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Payment',
    entityId: payment.id,
    metadata: {
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      amountMinor: payment.amountMinor,
      fromStatus: 'POSTED',
      toStatus: 'REVERSED',
      reason,
    } satisfies Prisma.InputJsonValue,
  });

  return mapPayment(payment);
}

export async function listPaymentAttachments(input: { tenantId: string; request: Request; paymentId: string }): Promise<SafeFileAttachmentResponse[]> {
  await requirePayment(input);
  return listFileAttachments({
    tenantId: input.tenantId,
    request: input.request,
    entityType: FileAttachmentEntityType.PAYMENT,
    entityId: input.paymentId,
  });
}

export async function createPaymentAttachment(input: PaymentAttachmentInput): Promise<SafeFileAttachmentResponse> {
  const payment = await requirePayment(input);
  return uploadFileAttachment({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    request: input.request,
    entityType: FileAttachmentEntityType.PAYMENT,
    entityId: input.paymentId,
    storagePathSegments: ['payments', String(payment.paymentDate.getUTCFullYear())],
    file: input.file,
  });
}

export async function deletePaymentAttachment(input: PaymentAttachmentDeleteInput): Promise<SafeFileAttachmentResponse> {
  await requirePayment(input);
  return deleteFileAttachment({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    request: input.request,
    entityType: FileAttachmentEntityType.PAYMENT,
    entityId: input.paymentId,
    attachmentId: input.attachmentId,
  });
}

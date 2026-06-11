import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType, BillStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';
import {
  deleteFileAttachment,
  listFileAttachments,
  uploadFileAttachment,
  type SafeFileAttachmentResponse,
} from './file-attachments.service';
import { FileAttachmentEntityType } from '@prisma/client';

export interface SafeBillReferenceResponse {
  id: string;
  name: string;
}

export interface SafeBillResponse {
  id: string;
  vendorId: string | null;
  vendor: SafeBillReferenceResponse | null;
  categoryId: string | null;
  category: SafeBillReferenceResponse | null;
  billNumber: string | null;
  billDate: Date;
  dueDate: Date | null;
  status: BillStatus;
  amountMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BillListResult {
  bills: SafeBillResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface ListBillsInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateBillInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  vendorId?: string | null;
  categoryId?: string | null;
  billNumber?: string | null;
  billDate: Date;
  dueDate?: Date | null;
  status?: BillStatus;
  amountMinor: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
}

export interface UpdateBillInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  billId: string;
  vendorId?: string | null;
  categoryId?: string | null;
  billNumber?: string | null;
  billDate?: Date;
  dueDate?: Date | null;
  status?: BillStatus;
  amountMinor?: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
}

export interface BillStatusInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  billId: string;
}

export interface BillAttachmentInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  billId: string;
  file: Express.Multer.File;
}

export interface BillAttachmentDeleteInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  billId: string;
  attachmentId: string;
}

const billReferenceSelect = {
  id: true,
  name: true,
} satisfies Prisma.VendorSelect;

const billSelect = {
  id: true,
  vendorId: true,
  categoryId: true,
  billNumber: true,
  billDate: true,
  dueDate: true,
  status: true,
  amountMinor: true,
  paidAmountMinor: true,
  balanceDueMinor: true,
  paymentMethod: true,
  paymentReference: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  vendor: {
    select: billReferenceSelect,
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BillSelect;

const billListSelect = {
  id: true,
  vendorId: true,
  categoryId: true,
  billNumber: true,
  billDate: true,
  dueDate: true,
  status: true,
  amountMinor: true,
  paidAmountMinor: true,
  balanceDueMinor: true,
  paymentMethod: true,
  paymentReference: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  vendor: {
    select: billReferenceSelect,
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BillSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function billNotFoundError(): AppError {
  return new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
}

function vendorNotFoundError(): AppError {
  return new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
}

function categoryNotFoundError(): AppError {
  return new AppError('Expense category not found', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
}

function invalidBillAmountError(): AppError {
  return new AppError('Invalid bill amount', 400, 'INVALID_BILL_AMOUNT');
}

function billLockedError(): AppError {
  return new AppError('Bill cannot be modified in its current state', 400, 'BILL_LOCKED');
}

function billNotOpenError(): AppError {
  return new AppError('Bill cannot be updated in its current state', 400, 'BILL_NOT_OPEN');
}

function mapReference(reference: { id: string; name: string } | null): SafeBillReferenceResponse | null {
  if (!reference) {
    return null;
  }

  return reference;
}

function mapBill(bill: {
  id: string;
  vendorId: string | null;
  categoryId: string | null;
  billNumber: string | null;
  billDate: Date;
  dueDate: Date | null;
  status: BillStatus;
  amountMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  vendor: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}): SafeBillResponse {
  return {
    id: bill.id,
    vendorId: bill.vendorId,
    vendor: mapReference(bill.vendor),
    categoryId: bill.categoryId,
    category: mapReference(bill.category),
    billNumber: bill.billNumber,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    status: bill.status,
    amountMinor: bill.amountMinor,
    paidAmountMinor: bill.paidAmountMinor,
    balanceDueMinor: bill.balanceDueMinor,
    paymentMethod: bill.paymentMethod,
    paymentReference: bill.paymentReference,
    notes: bill.notes,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
    deletedAt: bill.deletedAt,
  };
}

function buildBillWhere(input: Pick<ListBillsInput, 'tenantId' | 'search'>): Prisma.BillWhereInput {
  const where: Prisma.BillWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { billNumber: { contains: search, mode: 'insensitive' } },
      { paymentMethod: { contains: search, mode: 'insensitive' } },
      { paymentReference: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { vendor: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { category: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

async function resolveVendor(tx: Prisma.TransactionClient, tenantId: string, vendorId?: string | null): Promise<string | null | undefined> {
  if (vendorId === undefined) {
    return undefined;
  }

  if (vendorId === null) {
    return null;
  }

  const vendor = await tx.vendor.findFirst({
    where: {
      tenantId,
      id: vendorId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!vendor) {
    throw vendorNotFoundError();
  }

  return vendor.id;
}

async function resolveCategory(tx: Prisma.TransactionClient, tenantId: string, categoryId?: string | null): Promise<string | null | undefined> {
  if (categoryId === undefined) {
    return undefined;
  }

  if (categoryId === null) {
    return null;
  }

  const category = await tx.expenseCategory.findFirst({
    where: {
      tenantId,
      id: categoryId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!category) {
    throw categoryNotFoundError();
  }

  return category.id;
}

function billAmounts(status: BillStatus | undefined, amountMinor: number): { paidAmountMinor: number; balanceDueMinor: number } {
  if (status === BillStatus.PAID) {
    return {
      paidAmountMinor: amountMinor,
      balanceDueMinor: 0,
    };
  }

  if (status === BillStatus.VOID || status === BillStatus.ARCHIVED) {
    return {
      paidAmountMinor: 0,
      balanceDueMinor: 0,
    };
  }

  return {
    paidAmountMinor: 0,
    balanceDueMinor: amountMinor,
  };
}

function billChangeData(input: {
  vendorId?: string | null;
  categoryId?: string | null;
  billNumber?: string | null;
  billDate?: Date;
  dueDate?: Date | null;
  status?: BillStatus;
  amountMinor?: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  existingStatus?: BillStatus;
  existingAmountMinor?: number;
}): Prisma.BillUpdateInput {
  const data: Prisma.BillUpdateInput = {};

  if (input.billNumber !== undefined) data.billNumber = normalizeOptionalText(input.billNumber);
  if (input.billDate !== undefined) data.billDate = input.billDate;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.paymentMethod !== undefined) data.paymentMethod = normalizeOptionalText(input.paymentMethod);
  if (input.paymentReference !== undefined) data.paymentReference = normalizeOptionalText(input.paymentReference);
  if (input.notes !== undefined) data.notes = normalizeOptionalText(input.notes);

  if (input.vendorId !== undefined) {
    data.vendor = input.vendorId === null
      ? { disconnect: true }
      : { connect: { id: input.vendorId } };
  }

  if (input.categoryId !== undefined) {
    data.category = input.categoryId === null
      ? { disconnect: true }
      : { connect: { id: input.categoryId } };
  }

  if (input.amountMinor !== undefined || input.status !== undefined) {
    const amountMinor = input.amountMinor ?? input.existingAmountMinor ?? 0;
    if (!Number.isInteger(amountMinor) || amountMinor < 0) {
      throw invalidBillAmountError();
    }
    const amounts = billAmounts(input.status ?? input.existingStatus, amountMinor);
    data.amountMinor = amountMinor;
    data.paidAmountMinor = amounts.paidAmountMinor;
    data.balanceDueMinor = amounts.balanceDueMinor;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  return data;
}

export async function listBills(input: ListBillsInput): Promise<BillListResult> {
  const where = buildBillWhere(input);

  const [total, bills] = await prisma.$transaction([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      select: billListSelect,
      orderBy: [
        { billDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    bills: bills.map(mapBill),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getBill(input: { tenantId: string; billId: string }): Promise<SafeBillResponse> {
  const bill = await prisma.bill.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.billId,
      deletedAt: null,
    },
    select: billSelect,
  });

  if (!bill) {
    throw billNotFoundError();
  }

  return mapBill(bill);
}

export async function createBill(input: CreateBillInput): Promise<SafeBillResponse> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
    throw invalidBillAmountError();
  }

  const status = input.status ?? BillStatus.DRAFT;
  const amounts = billAmounts(status, input.amountMinor);

  const bill = await prisma.$transaction(async (tx) => {
    const vendorId = await resolveVendor(tx, input.tenantId, input.vendorId);
    const categoryId = await resolveCategory(tx, input.tenantId, input.categoryId);

    return tx.bill.create({
      data: {
        tenantId: input.tenantId,
        vendorId,
        categoryId,
        billNumber: normalizeOptionalText(input.billNumber),
        billDate: input.billDate,
        dueDate: input.dueDate ?? null,
        status,
        amountMinor: input.amountMinor,
        paidAmountMinor: amounts.paidAmountMinor,
        balanceDueMinor: amounts.balanceDueMinor,
        paymentMethod: normalizeOptionalText(input.paymentMethod),
        paymentReference: normalizeOptionalText(input.paymentReference),
        notes: normalizeOptionalText(input.notes),
      },
      select: billSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Bill',
    entityId: bill.id,
    metadata: {
      billId: bill.id,
      status: bill.status,
      amountMinor: bill.amountMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapBill(bill);
}

export async function updateBill(input: UpdateBillInput): Promise<SafeBillResponse> {
  const requestedData = {
    vendorId: input.vendorId,
    categoryId: input.categoryId,
    billNumber: input.billNumber,
    billDate: input.billDate,
    dueDate: input.dueDate,
    status: input.status,
    amountMinor: input.amountMinor,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    notes: input.notes,
  };

  if (Object.keys(requestedData).every((key) => requestedData[key as keyof typeof requestedData] === undefined)) {
    throw new AppError('No bill fields to update', 400, 'NO_BILL_FIELDS_TO_UPDATE');
  }

  const bill = await prisma.$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.billId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        amountMinor: true,
      },
    });

    if (!existing) {
      throw billNotFoundError();
    }

    if (existing.status === BillStatus.VOID || existing.status === BillStatus.ARCHIVED) {
      throw billLockedError();
    }

    const vendorId = input.vendorId === undefined ? undefined : await resolveVendor(tx, input.tenantId, input.vendorId);
    const categoryId = input.categoryId === undefined ? undefined : await resolveCategory(tx, input.tenantId, input.categoryId);
    const resolvedData = billChangeData({
      ...requestedData,
      vendorId,
      categoryId,
      existingStatus: existing.status,
      existingAmountMinor: existing.amountMinor,
    });

    return tx.bill.update({
      where: { id: existing.id },
      data: resolvedData,
      select: billSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Bill',
    entityId: bill.id,
    metadata: {
      billId: bill.id,
      changedFields: Object.keys(requestedData).filter((key) => requestedData[key as keyof typeof requestedData] !== undefined),
    } satisfies Prisma.InputJsonValue,
  });

  return mapBill(bill);
}

export async function markBillPaid(input: BillStatusInput): Promise<SafeBillResponse> {
  const bill = await prisma.$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.billId,
        deletedAt: null,
      },
      select: {
        id: true,
        amountMinor: true,
        status: true,
      },
    });

    if (!existing) {
      throw billNotFoundError();
    }

    if (existing.status === BillStatus.ARCHIVED) {
      throw billLockedError();
    }

    return tx.bill.update({
      where: { id: existing.id },
      data: {
        status: BillStatus.PAID,
        paidAmountMinor: existing.amountMinor,
        balanceDueMinor: 0,
      },
      select: billSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Bill',
    entityId: bill.id,
    metadata: {
      billId: bill.id,
      fromStatus: 'OPEN',
      toStatus: 'PAID',
    } satisfies Prisma.InputJsonValue,
  });

  return mapBill(bill);
}

export async function voidBill(input: BillStatusInput): Promise<SafeBillResponse> {
  const bill = await prisma.$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.billId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw billNotFoundError();
    }

    if (existing.status === BillStatus.PAID || existing.status === BillStatus.ARCHIVED) {
      throw billLockedError();
    }

    return tx.bill.update({
      where: { id: existing.id },
      data: {
        status: BillStatus.VOID,
        paidAmountMinor: 0,
        balanceDueMinor: 0,
      },
      select: billSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Bill',
    entityId: bill.id,
    metadata: {
      billId: bill.id,
      toStatus: 'VOID',
    } satisfies Prisma.InputJsonValue,
  });

  return mapBill(bill);
}

export async function archiveBill(input: BillStatusInput): Promise<SafeBillResponse> {
  const bill = await prisma.$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.billId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw billNotFoundError();
    }

    return tx.bill.update({
      where: { id: existing.id },
      data: {
        status: BillStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: billSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Bill',
    entityId: bill.id,
    metadata: {
      billId: bill.id,
      status: bill.status,
    } satisfies Prisma.InputJsonValue,
  });

  return mapBill(bill);
}

async function requireBillAttachmentBill(tenantId: string, billId: string): Promise<{ id: string; billDate: Date }> {
  const bill = await prisma.bill.findFirst({
    where: {
      tenantId,
      id: billId,
      deletedAt: null,
    },
    select: { id: true, billDate: true },
  });

  if (!bill) {
    throw billNotFoundError();
  }

  return bill;
}

export async function listBillAttachments(input: { tenantId: string; billId: string }): Promise<SafeFileAttachmentResponse[]> {
  await requireBillAttachmentBill(input.tenantId, input.billId);
  return listFileAttachments({
    tenantId: input.tenantId,
    entityType: FileAttachmentEntityType.BILL,
    entityId: input.billId,
  });
}

export async function createBillAttachment(input: BillAttachmentInput): Promise<SafeFileAttachmentResponse> {
  const bill = await requireBillAttachmentBill(input.tenantId, input.billId);
  return uploadFileAttachment({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    request: input.request,
    entityType: FileAttachmentEntityType.BILL,
    entityId: input.billId,
    storagePathSegments: ['bills', String(bill.billDate.getUTCFullYear())],
    file: input.file,
  });
}

export async function deleteBillAttachment(input: BillAttachmentDeleteInput): Promise<SafeFileAttachmentResponse> {
  await requireBillAttachmentBill(input.tenantId, input.billId);
  return deleteFileAttachment({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    request: input.request,
    entityType: FileAttachmentEntityType.BILL,
    entityId: input.billId,
    attachmentId: input.attachmentId,
  });
}

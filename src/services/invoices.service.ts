import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { InvoiceStatus, AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeInvoiceLineServiceItemResponse {
  id: string;
  name: string;
}

export interface SafeInvoiceLineResponse {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: SafeInvoiceLineServiceItemResponse | null;
  createdAt: Date;
}

export interface SafeInvoiceReferenceResponse {
  id: string;
  name: string;
}

export interface SafeInvoiceResponse {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceSequence: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  clientId: string | null;
  client: SafeInvoiceReferenceResponse | null;
  projectId: string | null;
  project: SafeInvoiceReferenceResponse | null;
  notes: string | null;
  terms: string | null;
  subtotalMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  lines: SafeInvoiceLineResponse[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SafeInvoiceListItemResponse {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceSequence: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  clientId: string | null;
  client: SafeInvoiceReferenceResponse | null;
  projectId: string | null;
  project: SafeInvoiceReferenceResponse | null;
  notes: string | null;
  terms: string | null;
  subtotalMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  serviceItemId?: string | null;
}

export interface CreateInvoiceInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  issueDate: Date;
  dueDate: Date;
  clientId?: string | null;
  projectId?: string | null;
  notes?: string | null;
  terms?: string | null;
  lines: InvoiceLineInput[];
}

export interface UpdateInvoiceInput {
  invoiceId: string;
  tenantId: string;
  actorUserId: string;
  request: Request;
  issueDate?: Date;
  dueDate?: Date;
  clientId?: string | null;
  projectId?: string | null;
  notes?: string | null;
  terms?: string | null;
  lines: InvoiceLineInput[];
}

export interface IssueInvoiceInput {
  invoiceId: string;
  tenantId: string;
  actorUserId: string;
  request: Request;
}

export interface CancelInvoiceInput {
  invoiceId: string;
  tenantId: string;
  actorUserId: string;
  request: Request;
  reason?: string | null;
}

export interface InvoiceListResult {
  invoices: SafeInvoiceListItemResponse[];
  page: number;
  limit: number;
  total: number;
}

const invoiceReferenceSelect = {
  id: true,
  name: true,
};

const invoiceLineSelect = {
  id: true,
  lineNumber: true,
  description: true,
  quantity: true,
  unitPriceMinor: true,
  lineTotalMinor: true,
  serviceItemId: true,
  createdAt: true,
  serviceItem: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.InvoiceLineSelect;

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  invoiceYear: true,
  invoiceSequence: true,
  status: true,
  issueDate: true,
  dueDate: true,
  clientId: true,
  projectId: true,
  notes: true,
  terms: true,
  subtotalMinor: true,
  totalMinor: true,
  paidAmountMinor: true,
  balanceDueMinor: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  client: {
    select: invoiceReferenceSelect,
  },
  project: {
    select: invoiceReferenceSelect,
  },
  lines: {
    where: {
      deletedAt: null,
    },
    select: invoiceLineSelect,
    orderBy: {
      lineNumber: 'asc',
    },
  },
} satisfies Prisma.InvoiceSelect;

const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  invoiceYear: true,
  invoiceSequence: true,
  status: true,
  issueDate: true,
  dueDate: true,
  clientId: true,
  projectId: true,
  notes: true,
  terms: true,
  subtotalMinor: true,
  totalMinor: true,
  paidAmountMinor: true,
  balanceDueMinor: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  client: {
    select: invoiceReferenceSelect,
  },
  project: {
    select: invoiceReferenceSelect,
  },
} satisfies Prisma.InvoiceSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function invoiceNotFoundError(): AppError {
  return new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
}

function clientNotFoundError(): AppError {
  return new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
}

function projectNotFoundError(): AppError {
  return new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
}

function serviceItemNotFoundError(): AppError {
  return new AppError('Service item not found', 404, 'SERVICE_ITEM_NOT_FOUND');
}

function invoiceLockedError(): AppError {
  return new AppError('Invoice can only be modified while draft', 400, 'INVOICE_NOT_DRAFT');
}

function invoiceIssueError(): AppError {
  return new AppError('Invoice can only be issued while draft', 400, 'INVOICE_NOT_DRAFT');
}

function invoiceCancellationError(): AppError {
  return new AppError('Invoice can only be cancelled after issue', 400, 'INVOICE_NOT_ISSUED');
}

function invoiceRequiresActiveLinesError(): AppError {
  return new AppError('Invoice requires at least one active line before issue', 400, 'INVOICE_REQUIRES_ACTIVE_LINES');
}

function invalidDueDateError(): AppError {
  return new AppError('Due date cannot be before issue date', 400, 'INVALID_DUE_DATE');
}

function invalidLineError(): AppError {
  return new AppError('Invoice requires at least one line', 400, 'INVALID_INVOICE_LINES');
}

function invalidMoneyError(): AppError {
  return new AppError('Invalid invoice money value', 400, 'INVALID_INVOICE_MONEY');
}

function buildInvoiceWhere(input: { tenantId: string; search?: string }): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { terms: { contains: search, mode: 'insensitive' } },
      { client: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { project: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

function mapInvoiceReference(reference: { id: string; name: string } | null): SafeInvoiceReferenceResponse | null {
  if (!reference) {
    return null;
  }

  return {
    id: reference.id,
    name: reference.name,
  };
}

function mapInvoiceLine(line: {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: { id: string; name: string } | null;
  createdAt: Date;
}): SafeInvoiceLineResponse {
  return {
    id: line.id,
    lineNumber: line.lineNumber,
    description: line.description,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    serviceItemId: line.serviceItemId,
    serviceItem: mapInvoiceReference(line.serviceItem),
    createdAt: line.createdAt,
  };
}

function mapInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceSequence: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  clientId: string | null;
  projectId: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  notes: string | null;
  terms: string | null;
  subtotalMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  lines?: Array<{
    id: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    serviceItemId: string | null;
    serviceItem: { id: string; name: string } | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeInvoiceResponse {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceYear: invoice.invoiceYear,
    invoiceSequence: invoice.invoiceSequence,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    clientId: invoice.clientId,
    client: mapInvoiceReference(invoice.client),
    projectId: invoice.projectId,
    project: mapInvoiceReference(invoice.project),
    notes: invoice.notes,
    terms: invoice.terms,
    subtotalMinor: invoice.subtotalMinor,
    totalMinor: invoice.totalMinor,
    paidAmountMinor: invoice.paidAmountMinor,
    balanceDueMinor: invoice.balanceDueMinor,
    lines: (invoice.lines ?? []).map(mapInvoiceLine),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    deletedAt: invoice.deletedAt,
  };
}

function mapInvoiceListItem(invoice: {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceSequence: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  clientId: string | null;
  projectId: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  notes: string | null;
  terms: string | null;
  subtotalMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeInvoiceListItemResponse {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceYear: invoice.invoiceYear,
    invoiceSequence: invoice.invoiceSequence,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    clientId: invoice.clientId,
    client: mapInvoiceReference(invoice.client),
    projectId: invoice.projectId,
    project: mapInvoiceReference(invoice.project),
    notes: invoice.notes,
    terms: invoice.terms,
    subtotalMinor: invoice.subtotalMinor,
    totalMinor: invoice.totalMinor,
    paidAmountMinor: invoice.paidAmountMinor,
    balanceDueMinor: invoice.balanceDueMinor,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    deletedAt: invoice.deletedAt,
  };
}

async function validateClient(tx: Prisma.TransactionClient, tenantId: string, clientId?: string | null): Promise<string | null | undefined> {
  if (clientId === undefined) return undefined;
  if (clientId === null) return null;

  const client = await tx.client.findFirst({
    where: {
      tenantId,
      id: clientId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!client) {
    throw clientNotFoundError();
  }

  return client.id;
}

async function validateProject(tx: Prisma.TransactionClient, tenantId: string, projectId?: string | null): Promise<string | null | undefined> {
  if (projectId === undefined) return undefined;
  if (projectId === null) return null;

  const project = await tx.project.findFirst({
    where: {
      tenantId,
      id: projectId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!project) {
    throw projectNotFoundError();
  }

  return project.id;
}

async function validateServiceItem(tx: Prisma.TransactionClient, tenantId: string, serviceItemId?: string | null): Promise<string | null | undefined> {
  if (serviceItemId === undefined) return undefined;
  if (serviceItemId === null) return null;

  const serviceItem = await tx.serviceItem.findFirst({
    where: {
      tenantId,
      id: serviceItemId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!serviceItem) {
    throw serviceItemNotFoundError();
  }

  return serviceItem.id;
}

function validateDateRange(issueDate: Date, dueDate: Date): void {
  if (dueDate.getTime() < issueDate.getTime()) {
    throw invalidDueDateError();
  }
}

function normalizeLines(lines: InvoiceLineInput[]): Array<InvoiceLineInput & { lineTotalMinor: number }> {
  if (lines.length === 0) {
    throw invalidLineError();
  }

  return lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new AppError('Invalid invoice quantity', 400, 'INVALID_INVOICE_QUANTITY');
    }

    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw invalidMoneyError();
    }

    const lineTotalMinor = line.quantity * line.unitPriceMinor;
    if (!Number.isSafeInteger(lineTotalMinor)) {
      throw invalidMoneyError();
    }

    return {
      ...line,
      description: normalizeOptionalText(line.description) ?? '',
      lineTotalMinor,
    };
  });
}

function invoiceLineData(lines: Array<InvoiceLineInput & { lineTotalMinor: number }>, tenantId: string, invoiceId: string, serviceItemIds: Array<string | null | undefined>) {
  return lines.map((line, index) => ({
    tenantId,
    invoiceId,
    lineNumber: index + 1,
    description: line.description,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    serviceItemId: serviceItemIds[index] ?? null,
  }));
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, tenantId: string, issueDate: Date): Promise<{ invoiceYear: number; invoiceSequence: number; invoiceNumber: string }> {
  const invoiceYear = issueDate.getUTCFullYear();
  const sequenceId = randomUUID();
  const rows = await tx.$queryRaw<Array<{ current_value: number }>>`
    INSERT INTO "invoice_sequences" ("id", "tenant_id", "invoice_year", "current_value", "created_at", "updated_at")
    VALUES (${sequenceId}::uuid, ${tenantId}::uuid, ${invoiceYear}::int, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tenant_id", "invoice_year")
    DO UPDATE SET "current_value" = "invoice_sequences"."current_value" + 1, "updated_at" = CURRENT_TIMESTAMP
    RETURNING "current_value";
  `;

  const invoiceSequence = rows[0]?.current_value;
  if (!invoiceSequence || !Number.isInteger(invoiceSequence)) {
    throw new AppError('Unable to allocate invoice number', 500, 'INVOICE_NUMBER_ALLOCATION_FAILED');
  }

  const invoiceNumber = `INV-${invoiceYear}-${String(invoiceSequence).padStart(4, '0')}`;
  return { invoiceYear, invoiceSequence, invoiceNumber };
}

async function createInvoiceRecord(
  tx: Prisma.TransactionClient,
  input: CreateInvoiceInput,
  lineInputs: Array<InvoiceLineInput & { lineTotalMinor: number }>,
  clientId: string | null | undefined,
  projectId: string | null | undefined,
) {
  const { invoiceYear, invoiceSequence, invoiceNumber } = await nextInvoiceNumber(tx, input.tenantId, input.issueDate);
  const subtotalMinor = lineInputs.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const totalMinor = subtotalMinor;
  const invoiceId = randomUUID();

  await tx.invoice.create({
    data: {
      id: invoiceId,
      tenantId: input.tenantId,
      clientId,
      projectId,
      invoiceNumber,
      invoiceYear,
      invoiceSequence,
      status: InvoiceStatus.DRAFT,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notes: normalizeOptionalText(input.notes),
      terms: normalizeOptionalText(input.terms),
      subtotalMinor,
      totalMinor,
      paidAmountMinor: 0,
      balanceDueMinor: subtotalMinor,
    },
  });

  const serviceItemIds = await Promise.all(lineInputs.map((line) => validateServiceItem(tx, input.tenantId, line.serviceItemId)));

  await tx.invoiceLine.createMany({
    data: invoiceLineData(lineInputs, input.tenantId, invoiceId, serviceItemIds),
  });

  const invoice = await tx.invoice.findFirst({
    where: {
      tenantId: input.tenantId,
      id: invoiceId,
      deletedAt: null,
    },
    select: invoiceSelect,
  });

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  return invoice;
}

export async function listInvoices(input: { tenantId: string; search?: string; page: number; limit: number }): Promise<InvoiceListResult> {
  const where = buildInvoiceWhere(input);

  const [total, invoices] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      select: invoiceListSelect,
      orderBy: [
        { issueDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    invoices: invoices.map(mapInvoiceListItem),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getInvoice(input: { tenantId: string; invoiceId: string }): Promise<SafeInvoiceResponse> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.invoiceId,
      deletedAt: null,
    },
    select: invoiceSelect,
  });

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  return mapInvoice(invoice);
}

export async function createInvoice(input: CreateInvoiceInput): Promise<SafeInvoiceResponse> {
  validateDateRange(input.issueDate, input.dueDate);

  const normalizedLines = normalizeLines(input.lines);

  const invoice = await prisma.$transaction(async (tx) => {
    const clientId = await validateClient(tx, input.tenantId, input.clientId);
    const projectId = await validateProject(tx, input.tenantId, input.projectId);
    return createInvoiceRecord(tx, input, normalizedLines, clientId, projectId);
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      lineCount: invoice.lines.length,
      subtotalMinor: invoice.subtotalMinor,
      totalMinor: invoice.totalMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapInvoice(invoice);
}

export async function issueInvoice(input: IssueInvoiceInput): Promise<SafeInvoiceResponse> {
  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.invoiceId,
        deletedAt: null,
      },
      select: invoiceSelect,
    });

    if (!existing) {
      throw invoiceNotFoundError();
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw invoiceIssueError();
    }

    if ((existing.lines ?? []).length === 0) {
      throw invoiceRequiresActiveLinesError();
    }

    return tx.invoice.update({
      where: { id: existing.id },
      data: {
        status: InvoiceStatus.ISSUED,
        paidAmountMinor: 0,
        balanceDueMinor: existing.totalMinor,
      },
      select: invoiceSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      fromStatus: 'DRAFT',
      toStatus: 'ISSUED',
      lineCount: invoice.lines.length,
    } satisfies Prisma.InputJsonValue,
  });

  return mapInvoice(invoice);
}

export async function cancelInvoice(input: CancelInvoiceInput): Promise<SafeInvoiceResponse> {
  const reason = normalizeOptionalText(input.reason);

  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.invoiceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        invoiceNumber: true,
      },
    });

    if (!existing) {
      throw invoiceNotFoundError();
    }

    if (existing.status !== InvoiceStatus.ISSUED) {
      throw invoiceCancellationError();
    }

    return tx.invoice.update({
      where: { id: existing.id },
      data: {
        status: InvoiceStatus.CANCELLED,
      },
      select: invoiceSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      fromStatus: 'ISSUED',
      toStatus: 'CANCELLED',
      reason,
    } satisfies Prisma.InputJsonValue,
  });

  return mapInvoice(invoice);
}

export async function updateInvoice(input: UpdateInvoiceInput): Promise<SafeInvoiceResponse> {
  const normalizedLines = normalizeLines(input.lines);

  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.invoiceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        issueDate: true,
        dueDate: true,
        clientId: true,
        projectId: true,
        notes: true,
        terms: true,
      },
    });

    if (!existing) {
      throw invoiceNotFoundError();
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw invoiceLockedError();
    }

    const issueDate = input.issueDate ?? existing.issueDate;
    const dueDate = input.dueDate ?? existing.dueDate;
    validateDateRange(issueDate, dueDate);

    const clientInput = input.clientId === undefined ? existing.clientId : input.clientId;
    const projectInput = input.projectId === undefined ? existing.projectId : input.projectId;
    const clientId = await validateClient(tx, input.tenantId, clientInput);
    const projectId = await validateProject(tx, input.tenantId, projectInput);
    const serviceItemIds = await Promise.all(
      normalizedLines.map((line) => validateServiceItem(tx, input.tenantId, line.serviceItemId)),
    );

    const subtotalMinor = normalizedLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    const totalMinor = subtotalMinor;

    await tx.invoiceLine.updateMany({
      where: {
        tenantId: input.tenantId,
        invoiceId: existing.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    const updated = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        clientId,
        projectId,
        issueDate,
        dueDate,
        notes: input.notes === undefined ? existing.notes : normalizeOptionalText(input.notes),
        terms: input.terms === undefined ? existing.terms : normalizeOptionalText(input.terms),
        subtotalMinor,
        totalMinor,
        paidAmountMinor: 0,
        balanceDueMinor: subtotalMinor,
      },
      select: invoiceSelect,
    });

    await tx.invoiceLine.createMany({
      data: invoiceLineData(normalizedLines, input.tenantId, updated.id, serviceItemIds),
    });

    return tx.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: updated.id,
        deletedAt: null,
      },
      select: invoiceSelect,
    });
  });

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      lineCount: invoice.lines.length,
      subtotalMinor: invoice.subtotalMinor,
      totalMinor: invoice.totalMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapInvoice(invoice);
}

export async function archiveInvoice(input: { tenantId: string; actorUserId: string; invoiceId: string; request: Request }): Promise<SafeInvoiceResponse> {
  const now = new Date();

  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.invoiceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw invoiceNotFoundError();
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw invoiceLockedError();
    }

    return tx.invoice.update({
      where: { id: existing.id },
      data: {
        status: InvoiceStatus.ARCHIVED,
        deletedAt: now,
      },
      select: invoiceSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalMinor: invoice.totalMinor,
    } satisfies Prisma.InputJsonValue,
  });

  return mapInvoice(invoice);
}

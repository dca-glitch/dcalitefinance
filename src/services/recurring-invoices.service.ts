import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType, RecurringInvoiceFrequency, RecurringInvoiceRunStatus, RecurringInvoiceStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { createInvoice as createInvoiceService } from './invoices.service';
import { writeAuditLog } from './audit.service';

export interface SafeRecurringInvoiceLineServiceItemResponse {
  id: string;
  name: string;
}

export interface SafeRecurringInvoiceLineResponse {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: SafeRecurringInvoiceLineServiceItemResponse | null;
  createdAt: Date;
}

export interface SafeRecurringInvoiceReferenceResponse {
  id: string;
  name: string;
}

export interface SafeRecurringInvoiceResponse {
  id: string;
  clientId: string | null;
  client: SafeRecurringInvoiceReferenceResponse | null;
  projectId: string | null;
  project: SafeRecurringInvoiceReferenceResponse | null;
  status: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: Date;
  endDate: Date | null;
  nextRunDate: Date;
  lastRunDate: Date | null;
  notes: string | null;
  terms: string | null;
  lines: SafeRecurringInvoiceLineResponse[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SafeRecurringInvoiceListItemResponse {
  id: string;
  clientId: string | null;
  client: SafeRecurringInvoiceReferenceResponse | null;
  projectId: string | null;
  project: SafeRecurringInvoiceReferenceResponse | null;
  status: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: Date;
  endDate: Date | null;
  nextRunDate: Date;
  lastRunDate: Date | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SafeRecurringInvoiceRunResponse {
  id: string;
  recurringInvoiceId: string;
  scheduledFor: Date;
  generatedInvoiceId: string | null;
  status: RecurringInvoiceRunStatus;
  errorMessage: string | null;
  createdAt: Date;
}

export interface ListRecurringInvoicesInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateRecurringInvoiceInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  clientId?: string | null;
  projectId?: string | null;
  status?: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: Date;
  endDate?: Date | null;
  nextRunDate: Date;
  notes?: string | null;
  terms?: string | null;
  lines: RecurringInvoiceLineInput[];
}

export interface UpdateRecurringInvoiceInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  recurringInvoiceId: string;
  clientId?: string | null;
  projectId?: string | null;
  status?: RecurringInvoiceStatus;
  frequency?: RecurringInvoiceFrequency;
  startDate?: Date;
  endDate?: Date | null;
  nextRunDate?: Date;
  notes?: string | null;
  terms?: string | null;
  lines?: RecurringInvoiceLineInput[];
}

export interface RecurringInvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  serviceItemId?: string | null;
}

export interface RecurringInvoiceStatusInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  recurringInvoiceId: string;
}

export interface RecurringInvoiceRunInput extends RecurringInvoiceStatusInput {
  scheduledFor?: Date;
}

export interface RecurringInvoiceListResult {
  recurringInvoices: SafeRecurringInvoiceListItemResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface RecurringInvoiceGenerateResult {
  recurringInvoice: SafeRecurringInvoiceResponse;
  run: SafeRecurringInvoiceRunResponse;
  invoice: Awaited<ReturnType<typeof createInvoiceService>> | null;
}

const recurringReferenceSelect = {
  id: true,
  name: true,
} satisfies Prisma.ClientSelect;

const recurringLineSelect = {
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
} satisfies Prisma.RecurringInvoiceLineSelect;

const recurringInvoiceWithLinesSelect = {
  id: true,
  clientId: true,
  projectId: true,
  status: true,
  frequency: true,
  startDate: true,
  endDate: true,
  nextRunDate: true,
  lastRunDate: true,
  notes: true,
  terms: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  client: {
    select: recurringReferenceSelect,
  },
  project: {
    select: recurringReferenceSelect,
  },
  lines: {
    select: recurringLineSelect,
    orderBy: {
      lineNumber: 'asc',
    },
  },
} satisfies Prisma.RecurringInvoiceSelect;

const recurringInvoiceListSelect = {
  id: true,
  clientId: true,
  projectId: true,
  status: true,
  frequency: true,
  startDate: true,
  endDate: true,
  nextRunDate: true,
  lastRunDate: true,
  notes: true,
  terms: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  client: {
    select: recurringReferenceSelect,
  },
  project: {
    select: recurringReferenceSelect,
  },
} satisfies Prisma.RecurringInvoiceSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function recurringInvoiceNotFoundError(): AppError {
  return new AppError('Recurring invoice not found', 404, 'RECURRING_INVOICE_NOT_FOUND');
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

function invalidLineError(): AppError {
  return new AppError('Recurring invoice requires at least one line', 400, 'INVALID_RECURRING_INVOICE_LINES');
}

function invalidMoneyError(): AppError {
  return new AppError('Invalid recurring invoice money value', 400, 'INVALID_RECURRING_INVOICE_MONEY');
}

function invalidDueDateError(): AppError {
  return new AppError('Next run date cannot be before start date', 400, 'INVALID_RECURRING_INVOICE_DATE');
}

function mapRecurringReference(reference: { id: string; name: string } | null): SafeRecurringInvoiceReferenceResponse | null {
  if (!reference) {
    return null;
  }

  return reference;
}

function mapRecurringLine(line: {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: { id: string; name: string } | null;
  createdAt: Date;
}): SafeRecurringInvoiceLineResponse {
  return {
    id: line.id,
    lineNumber: line.lineNumber,
    description: line.description,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    serviceItemId: line.serviceItemId,
    serviceItem: mapRecurringReference(line.serviceItem),
    createdAt: line.createdAt,
  };
}

function mapRecurringInvoice(invoice: {
  id: string;
  clientId: string | null;
  projectId: string | null;
  status: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: Date;
  endDate: Date | null;
  nextRunDate: Date;
  lastRunDate: Date | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  notes: string | null;
  terms: string | null;
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
}): SafeRecurringInvoiceResponse {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    client: mapRecurringReference(invoice.client),
    projectId: invoice.projectId,
    project: mapRecurringReference(invoice.project),
    status: invoice.status,
    frequency: invoice.frequency,
    startDate: invoice.startDate,
    endDate: invoice.endDate,
    nextRunDate: invoice.nextRunDate,
    lastRunDate: invoice.lastRunDate,
    notes: invoice.notes,
    terms: invoice.terms,
    lines: (invoice.lines ?? []).map(mapRecurringLine),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    deletedAt: invoice.deletedAt,
  };
}

function mapRecurringListItem(invoice: {
  id: string;
  clientId: string | null;
  projectId: string | null;
  status: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: Date;
  endDate: Date | null;
  nextRunDate: Date;
  lastRunDate: Date | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeRecurringInvoiceListItemResponse {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    client: mapRecurringReference(invoice.client),
    projectId: invoice.projectId,
    project: mapRecurringReference(invoice.project),
    status: invoice.status,
    frequency: invoice.frequency,
    startDate: invoice.startDate,
    endDate: invoice.endDate,
    nextRunDate: invoice.nextRunDate,
    lastRunDate: invoice.lastRunDate,
    notes: invoice.notes,
    terms: invoice.terms,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    deletedAt: invoice.deletedAt,
  };
}

function buildRecurringWhere(input: Pick<ListRecurringInvoicesInput, 'tenantId' | 'search'>): Prisma.RecurringInvoiceWhereInput {
  const where: Prisma.RecurringInvoiceWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { terms: { contains: search, mode: 'insensitive' } },
      { client: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { project: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

async function resolveClient(tx: Prisma.TransactionClient, tenantId: string, clientId?: string | null): Promise<string | null | undefined> {
  if (clientId === undefined) {
    return undefined;
  }

  if (clientId === null) {
    return null;
  }

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

async function resolveProject(tx: Prisma.TransactionClient, tenantId: string, projectId?: string | null): Promise<string | null | undefined> {
  if (projectId === undefined) {
    return undefined;
  }

  if (projectId === null) {
    return null;
  }

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

async function resolveServiceItem(tx: Prisma.TransactionClient, tenantId: string, serviceItemId?: string | null): Promise<string | null | undefined> {
  if (serviceItemId === undefined) {
    return undefined;
  }

  if (serviceItemId === null) {
    return null;
  }

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

function normalizeFrequencyAdvance(date: Date, frequency: RecurringInvoiceFrequency): Date {
  const next = new Date(date);

  if (frequency === RecurringInvoiceFrequency.MONTHLY) {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === RecurringInvoiceFrequency.QUARTERLY) {
    next.setMonth(next.getMonth() + 3);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function normalizeLines(lines: RecurringInvoiceLineInput[]): Array<RecurringInvoiceLineInput & { lineTotalMinor: number }> {
  if (lines.length === 0) {
    throw invalidLineError();
  }

  return lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new AppError('Invalid recurring invoice quantity', 400, 'INVALID_RECURRING_INVOICE_QUANTITY');
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

async function createOrReplaceRecurringLines(
  tx: Prisma.TransactionClient,
  tenantId: string,
  recurringInvoiceId: string,
  lines: Array<RecurringInvoiceLineInput & { lineTotalMinor: number }>,
): Promise<void> {
  await tx.recurringInvoiceLine.deleteMany({
    where: {
      tenantId,
      recurringInvoiceId,
    },
  });

  const serviceItemIds = await Promise.all(lines.map((line) => resolveServiceItem(tx, tenantId, line.serviceItemId)));

  await tx.recurringInvoiceLine.createMany({
    data: lines.map((line, index) => ({
      tenantId,
      recurringInvoiceId,
      lineNumber: index + 1,
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
      serviceItemId: serviceItemIds[index] ?? null,
    })),
  });
}

async function fetchRecurringInvoice(
  client: Pick<typeof prisma, 'recurringInvoice'>,
  tenantId: string,
  recurringInvoiceId: string,
) {
  return client.recurringInvoice.findFirst({
    where: {
      tenantId,
      id: recurringInvoiceId,
      deletedAt: null,
    },
    select: recurringInvoiceWithLinesSelect,
  });
}

export async function listRecurringInvoices(input: ListRecurringInvoicesInput): Promise<RecurringInvoiceListResult> {
  const where = buildRecurringWhere(input);

  const [total, recurringInvoices] = await prisma.$transaction([
    prisma.recurringInvoice.count({ where }),
    prisma.recurringInvoice.findMany({
      where,
      select: recurringInvoiceListSelect,
      orderBy: [
        { nextRunDate: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    recurringInvoices: recurringInvoices.map(mapRecurringListItem),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getRecurringInvoice(input: { tenantId: string; recurringInvoiceId: string }): Promise<SafeRecurringInvoiceResponse> {
  const recurringInvoice = await fetchRecurringInvoice(prisma, input.tenantId, input.recurringInvoiceId);

  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  return mapRecurringInvoice(recurringInvoice);
}

export async function createRecurringInvoice(input: CreateRecurringInvoiceInput): Promise<SafeRecurringInvoiceResponse> {
  if (input.nextRunDate.getTime() < input.startDate.getTime()) {
    throw invalidDueDateError();
  }

  const normalizedLines = normalizeLines(input.lines);

  const recurringInvoice = await prisma.$transaction(async (tx) => {
    const clientId = await resolveClient(tx, input.tenantId, input.clientId);
    const projectId = await resolveProject(tx, input.tenantId, input.projectId);
    const recurring = await tx.recurringInvoice.create({
      data: {
        tenantId: input.tenantId,
        clientId,
        projectId,
        status: input.status ?? RecurringInvoiceStatus.ACTIVE,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        nextRunDate: input.nextRunDate,
        notes: normalizeOptionalText(input.notes),
        terms: normalizeOptionalText(input.terms),
      },
      select: {
        id: true,
      },
    });

    await createOrReplaceRecurringLines(tx, input.tenantId, recurring.id, normalizedLines);

    return fetchRecurringInvoice(tx, input.tenantId, recurring.id);
  });

  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'RecurringInvoice',
    entityId: recurringInvoice.id,
    metadata: {
      recurringInvoiceId: recurringInvoice.id,
      lineCount: recurringInvoice.lines.length,
      frequency: recurringInvoice.frequency,
    } satisfies Prisma.InputJsonValue,
  });

  return mapRecurringInvoice(recurringInvoice);
}

export async function updateRecurringInvoice(input: UpdateRecurringInvoiceInput): Promise<SafeRecurringInvoiceResponse> {
  const normalizedLines = input.lines ? normalizeLines(input.lines) : null;

  const recurringInvoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.recurringInvoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.recurringInvoiceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        nextRunDate: true,
      },
    });

    if (!existing) {
      throw recurringInvoiceNotFoundError();
    }

    if (existing.status === RecurringInvoiceStatus.ARCHIVED) {
      throw new AppError('Recurring invoice cannot be modified after archive', 400, 'RECURRING_INVOICE_ARCHIVED');
    }

    const clientId = input.clientId === undefined ? undefined : await resolveClient(tx, input.tenantId, input.clientId);
    const projectId = input.projectId === undefined ? undefined : await resolveProject(tx, input.tenantId, input.projectId);

    if (
      input.startDate &&
      input.nextRunDate &&
      input.nextRunDate.getTime() < input.startDate.getTime()
    ) {
      throw invalidDueDateError();
    }

    const updated = await tx.recurringInvoice.update({
      where: { id: existing.id },
      data: {
        clientId,
        projectId,
        status: input.status ?? undefined,
        frequency: input.frequency ?? undefined,
        startDate: input.startDate ?? undefined,
        endDate: input.endDate === undefined ? undefined : input.endDate,
        nextRunDate: input.nextRunDate ?? undefined,
        notes: input.notes === undefined ? undefined : normalizeOptionalText(input.notes),
        terms: input.terms === undefined ? undefined : normalizeOptionalText(input.terms),
      },
      select: {
        id: true,
      },
    });

    if (normalizedLines) {
      await createOrReplaceRecurringLines(tx, input.tenantId, updated.id, normalizedLines);
    }

    return fetchRecurringInvoice(tx, input.tenantId, updated.id);
  });

  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'RecurringInvoice',
    entityId: recurringInvoice.id,
    metadata: {
      recurringInvoiceId: recurringInvoice.id,
      lineCount: recurringInvoice.lines.length,
    } satisfies Prisma.InputJsonValue,
  });

  return mapRecurringInvoice(recurringInvoice);
}

export async function pauseRecurringInvoice(input: RecurringInvoiceStatusInput): Promise<SafeRecurringInvoiceResponse> {
  const recurringInvoice = await prisma.recurringInvoice.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.recurringInvoiceId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  const updated = await prisma.recurringInvoice.update({
    where: { id: recurringInvoice.id },
    data: {
      status: RecurringInvoiceStatus.PAUSED,
    },
    select: {
      ...recurringInvoiceWithLinesSelect,
    },
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'RecurringInvoice',
    entityId: updated.id,
    metadata: {
      recurringInvoiceId: updated.id,
      toStatus: 'PAUSED',
    } satisfies Prisma.InputJsonValue,
  });

  return mapRecurringInvoice(updated);
}

export async function resumeRecurringInvoice(input: RecurringInvoiceStatusInput): Promise<SafeRecurringInvoiceResponse> {
  const recurringInvoice = await prisma.recurringInvoice.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.recurringInvoiceId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  const updated = await prisma.recurringInvoice.update({
    where: { id: recurringInvoice.id },
    data: {
      status: RecurringInvoiceStatus.ACTIVE,
    },
    select: {
      ...recurringInvoiceWithLinesSelect,
    },
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'RecurringInvoice',
    entityId: updated.id,
    metadata: {
      recurringInvoiceId: updated.id,
      toStatus: 'ACTIVE',
    } satisfies Prisma.InputJsonValue,
  });

  return mapRecurringInvoice(updated);
}

export async function generateRecurringInvoiceNow(input: RecurringInvoiceRunInput): Promise<RecurringInvoiceGenerateResult> {
  const scheduledFor = input.scheduledFor ?? new Date();
  const idempotencyKey = `${input.recurringInvoiceId}:${scheduledFor.toISOString().slice(0, 10)}`;

  const existingRun = await prisma.recurringInvoiceRun.findUnique({
    where: {
      idempotencyKey,
    },
    select: {
      id: true,
      recurringInvoiceId: true,
      scheduledFor: true,
      generatedInvoiceId: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  if (existingRun) {
    const recurringInvoice = await fetchRecurringInvoice(prisma, input.tenantId, input.recurringInvoiceId);
    if (!recurringInvoice) {
      throw recurringInvoiceNotFoundError();
    }

    let invoice = null;
    if (existingRun.generatedInvoiceId) {
      const generated = await prisma.invoice.findFirst({
        where: {
          tenantId: input.tenantId,
          id: existingRun.generatedInvoiceId,
          deletedAt: null,
        },
        select: {
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
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          lines: {
            select: {
              id: true,
              lineNumber: true,
              description: true,
              quantity: true,
              unitPriceMinor: true,
              lineTotalMinor: true,
              serviceItemId: true,
              createdAt: true,
              serviceItem: { select: { id: true, name: true } },
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
      });
      invoice = generated ?? null;
    }

    return {
      recurringInvoice: mapRecurringInvoice(recurringInvoice),
      run: {
        id: existingRun.id,
        recurringInvoiceId: existingRun.recurringInvoiceId,
        scheduledFor: existingRun.scheduledFor,
        generatedInvoiceId: existingRun.generatedInvoiceId,
        status: existingRun.status,
        errorMessage: existingRun.errorMessage,
        createdAt: existingRun.createdAt,
      },
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoiceYear: invoice.invoiceYear,
            invoiceSequence: invoice.invoiceSequence,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            clientId: invoice.clientId,
            client: invoice.client,
            projectId: invoice.projectId,
            project: invoice.project,
            notes: invoice.notes,
            terms: invoice.terms,
            subtotalMinor: invoice.subtotalMinor,
            totalMinor: invoice.totalMinor,
            paidAmountMinor: invoice.paidAmountMinor,
            balanceDueMinor: invoice.balanceDueMinor,
            lines: invoice.lines.map((line) => ({
              id: line.id,
              lineNumber: line.lineNumber,
              description: line.description,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              lineTotalMinor: line.lineTotalMinor,
              serviceItemId: line.serviceItemId,
              serviceItem: line.serviceItem,
              createdAt: line.createdAt,
            })),
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            deletedAt: invoice.deletedAt,
          }
        : null,
    };
  }

  const recurringInvoice = await fetchRecurringInvoice(prisma, input.tenantId, input.recurringInvoiceId);
  if (!recurringInvoice) {
    throw recurringInvoiceNotFoundError();
  }

  const nextRunDate = recurringInvoice.nextRunDate;
  if (recurringInvoice.status !== RecurringInvoiceStatus.ACTIVE) {
    const run = await prisma.recurringInvoiceRun.create({
      data: {
        tenantId: input.tenantId,
        recurringInvoiceId: recurringInvoice.id,
        scheduledFor,
        status: RecurringInvoiceRunStatus.SKIPPED,
        idempotencyKey,
        errorMessage: 'Recurring invoice is not active',
      },
    });

    return {
      recurringInvoice: mapRecurringInvoice(recurringInvoice),
      run: {
        id: run.id,
        recurringInvoiceId: run.recurringInvoiceId,
        scheduledFor: run.scheduledFor,
        generatedInvoiceId: run.generatedInvoiceId,
        status: run.status,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
      },
      invoice: null,
    };
  }

  if (recurringInvoice.endDate && nextRunDate.getTime() > recurringInvoice.endDate.getTime()) {
    const run = await prisma.recurringInvoiceRun.create({
      data: {
        tenantId: input.tenantId,
        recurringInvoiceId: recurringInvoice.id,
        scheduledFor,
        status: RecurringInvoiceRunStatus.SKIPPED,
        idempotencyKey,
        errorMessage: 'Recurring invoice end date has passed',
      },
    });

    return {
      recurringInvoice: mapRecurringInvoice(recurringInvoice),
      run: {
        id: run.id,
        recurringInvoiceId: run.recurringInvoiceId,
        scheduledFor: run.scheduledFor,
        generatedInvoiceId: run.generatedInvoiceId,
        status: run.status,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
      },
      invoice: null,
    };
  }

  try {
    const invoice = await createInvoiceService({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      request: input.request,
      issueDate: nextRunDate,
      dueDate: new Date(nextRunDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      clientId: recurringInvoice.clientId,
      projectId: recurringInvoice.projectId,
      notes: recurringInvoice.notes,
      terms: recurringInvoice.terms,
      lines: recurringInvoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        serviceItemId: line.serviceItemId,
      })),
    });

    const advancedNextRunDate = normalizeFrequencyAdvance(nextRunDate, recurringInvoice.frequency);

    const updatedRecurringInvoice = await prisma.recurringInvoice.update({
      where: { id: recurringInvoice.id },
      data: {
        lastRunDate: nextRunDate,
        nextRunDate: advancedNextRunDate,
      },
    select: {
      ...recurringInvoiceWithLinesSelect,
    },
  });

    const run = await prisma.recurringInvoiceRun.create({
      data: {
        tenantId: input.tenantId,
        recurringInvoiceId: recurringInvoice.id,
        scheduledFor,
        generatedInvoiceId: invoice.id,
        status: RecurringInvoiceRunStatus.SUCCESS,
        idempotencyKey,
      },
    });

    await writeAuditLog({
      actorType: AuditActorType.USER,
      action: AuditAction.UPDATE,
      actorUserId: input.actorUserId,
      tenantId: input.tenantId,
      request: input.request,
      entityType: 'RecurringInvoice',
      entityId: updatedRecurringInvoice.id,
      metadata: {
        recurringInvoiceId: updatedRecurringInvoice.id,
        generatedInvoiceId: invoice.id,
        runId: run.id,
      } satisfies Prisma.InputJsonValue,
    });

    return {
      recurringInvoice: mapRecurringInvoice(updatedRecurringInvoice),
      run: {
        id: run.id,
        recurringInvoiceId: run.recurringInvoiceId,
        scheduledFor: run.scheduledFor,
        generatedInvoiceId: run.generatedInvoiceId,
        status: run.status,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
      },
      invoice,
    };
  } catch (error) {
    const failedRun = await prisma.recurringInvoiceRun.create({
      data: {
        tenantId: input.tenantId,
        recurringInvoiceId: recurringInvoice.id,
        scheduledFor,
        status: RecurringInvoiceRunStatus.FAILED,
        idempotencyKey,
        errorMessage: error instanceof Error ? error.message : 'Failed to generate invoice',
      },
    });

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to generate invoice',
      400,
      'RECURRING_INVOICE_GENERATION_FAILED',
    );
  }
}

export async function archiveRecurringInvoice(input: RecurringInvoiceStatusInput): Promise<SafeRecurringInvoiceResponse> {
  const recurringInvoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.recurringInvoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.recurringInvoiceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw recurringInvoiceNotFoundError();
    }

    return tx.recurringInvoice.update({
      where: { id: existing.id },
      data: {
        status: RecurringInvoiceStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: recurringInvoiceWithLinesSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'RecurringInvoice',
    entityId: recurringInvoice.id,
    metadata: {
      recurringInvoiceId: recurringInvoice.id,
      status: recurringInvoice.status,
    } satisfies Prisma.InputJsonValue,
  });

  return mapRecurringInvoice(recurringInvoice);
}

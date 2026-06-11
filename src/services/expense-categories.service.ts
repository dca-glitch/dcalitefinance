import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeExpenseCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListExpenseCategoriesInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateExpenseCategoryInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  name: string;
  description?: string | null;
}

export interface UpdateExpenseCategoryInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  categoryId: string;
  name?: string;
  description?: string | null;
}

export interface ExpenseCategoryListResult {
  expenseCategories: SafeExpenseCategoryResponse[];
  page: number;
  limit: number;
  total: number;
}

const categorySelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ExpenseCategorySelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapCategory(category: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeExpenseCategoryResponse {
  return category;
}

function categoryNotFoundError(): AppError {
  return new AppError('Expense category not found', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
}

function buildCategoryWhere(input: Pick<ListExpenseCategoriesInput, 'tenantId' | 'search'>): Prisma.ExpenseCategoryWhereInput {
  const where: Prisma.ExpenseCategoryWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function categoryChangeData(input: {
  name?: string;
  description?: string | null;
}): Prisma.ExpenseCategoryUpdateInput {
  const data: Prisma.ExpenseCategoryUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = normalizeOptionalText(input.description);

  return data;
}

export async function listExpenseCategories(input: ListExpenseCategoriesInput): Promise<ExpenseCategoryListResult> {
  const where = buildCategoryWhere(input);

  const [total, expenseCategories] = await prisma.$transaction([
    prisma.expenseCategory.count({ where }),
    prisma.expenseCategory.findMany({
      where,
      select: categorySelect,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    expenseCategories: expenseCategories.map(mapCategory),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getExpenseCategory(input: { tenantId: string; categoryId: string }): Promise<SafeExpenseCategoryResponse> {
  const category = await prisma.expenseCategory.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.categoryId,
      deletedAt: null,
    },
    select: categorySelect,
  });

  if (!category) {
    throw categoryNotFoundError();
  }

  return mapCategory(category);
}

export async function createExpenseCategory(input: CreateExpenseCategoryInput): Promise<SafeExpenseCategoryResponse> {
  const category = await prisma.expenseCategory.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      description: normalizeOptionalText(input.description),
    },
    select: categorySelect,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ExpenseCategory',
    entityId: category.id,
    metadata: {
      categoryId: category.id,
      name: category.name,
    } satisfies Prisma.InputJsonValue,
  });

  return mapCategory(category);
}

export async function updateExpenseCategory(input: UpdateExpenseCategoryInput): Promise<SafeExpenseCategoryResponse> {
  const data = categoryChangeData({
    name: input.name,
    description: input.description,
  });

  if (Object.keys(data).length === 0) {
    throw new AppError('No expense category fields to update', 400, 'NO_EXPENSE_CATEGORY_FIELDS_TO_UPDATE');
  }

  const category = await prisma.$transaction(async (tx) => {
    const existing = await tx.expenseCategory.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.categoryId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw categoryNotFoundError();
    }

    return tx.expenseCategory.update({
      where: { id: existing.id },
      data,
      select: categorySelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ExpenseCategory',
    entityId: category.id,
    metadata: {
      categoryId: category.id,
      changedFields: Object.keys(data),
    } satisfies Prisma.InputJsonValue,
  });

  return mapCategory(category);
}

export async function archiveExpenseCategory(input: {
  tenantId: string;
  actorUserId: string;
  categoryId: string;
  request: Request;
}): Promise<SafeExpenseCategoryResponse> {
  const now = new Date();

  const category = await prisma.$transaction(async (tx) => {
    const existing = await tx.expenseCategory.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.categoryId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw categoryNotFoundError();
    }

    return tx.expenseCategory.update({
      where: { id: existing.id },
      data: {
        deletedAt: now,
      },
      select: categorySelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'ExpenseCategory',
    entityId: category.id,
    metadata: {
      categoryId: category.id,
    } satisfies Prisma.InputJsonValue,
  });

  return mapCategory(category);
}

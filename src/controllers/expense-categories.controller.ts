import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  archiveExpenseCategory as archiveExpenseCategoryService,
  createExpenseCategory as createExpenseCategoryService,
  getExpenseCategory as getExpenseCategoryService,
  listExpenseCategories as listExpenseCategoriesService,
  updateExpenseCategory as updateExpenseCategoryService,
} from '../services/expense-categories.service';

const categoryIdSchema = z.string().uuid();

const listExpenseCategoriesQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const categoryBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
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

export async function listExpenseCategoriesHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listExpenseCategoriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid expense category query', 400, 'INVALID_EXPENSE_CATEGORY_QUERY');
  }

  const result = await listExpenseCategoriesService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(toJsonSafe({ success: true, data: result }));
}

export async function getExpenseCategoryHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const categoryId = categoryIdSchema.parse(req.params.categoryId);
  const expenseCategory = await getExpenseCategoryService({ tenantId: context.tenantId, categoryId });
  res.status(200).json(toJsonSafe({ success: true, data: { expenseCategory } }));
}

export async function createExpenseCategoryHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = categoryBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid expense category payload', 400, 'INVALID_EXPENSE_CATEGORY_PAYLOAD');
  }

  const expenseCategory = await createExpenseCategoryService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
  });

  res.status(201).json(toJsonSafe({ success: true, data: { expenseCategory } }));
}

export async function updateExpenseCategoryHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const categoryId = categoryIdSchema.parse(req.params.categoryId);
  const parsed = categoryBodySchema.partial().safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid expense category update payload', 400, 'INVALID_EXPENSE_CATEGORY_UPDATE_PAYLOAD');
  }

  const expenseCategory = await updateExpenseCategoryService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    categoryId,
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { expenseCategory } }));
}

export async function archiveExpenseCategoryHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const categoryId = categoryIdSchema.parse(req.params.categoryId);
  const expenseCategory = await archiveExpenseCategoryService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    categoryId,
    request: req,
  });

  res.status(200).json(toJsonSafe({ success: true, data: { expenseCategory } }));
}

import { Router } from 'express';
import {
  archiveExpenseCategoryHandler,
  createExpenseCategoryHandler,
  getExpenseCategoryHandler,
  listExpenseCategoriesHandler,
  updateExpenseCategoryHandler,
} from '../controllers/expense-categories.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const expenseCategoriesRoutes = Router();

expenseCategoriesRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['expenseCategory:read', 'expenseCategory:manage'])),
  asyncHandler(listExpenseCategoriesHandler),
);
expenseCategoriesRoutes.get(
  '/:categoryId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['expenseCategory:read', 'expenseCategory:manage'])),
  asyncHandler(getExpenseCategoryHandler),
);
expenseCategoriesRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('expenseCategory:manage')),
  asyncHandler(createExpenseCategoryHandler),
);
expenseCategoriesRoutes.patch(
  '/:categoryId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('expenseCategory:manage')),
  asyncHandler(updateExpenseCategoryHandler),
);
expenseCategoriesRoutes.delete(
  '/:categoryId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('expenseCategory:manage')),
  asyncHandler(archiveExpenseCategoryHandler),
);

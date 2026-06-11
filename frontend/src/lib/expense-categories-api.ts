import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  ExpenseCategoryData,
  ExpenseCategoryMutationInput,
  ExpenseCategoriesListData,
  ListExpenseCategoriesParams,
} from '../types/expense-category';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListExpenseCategoriesParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `/expense-categories?${queryString}` : '/expense-categories';
}

export async function listExpenseCategories(params: ListExpenseCategoriesParams = {}): Promise<ExpenseCategoriesListData> {
  const response = await apiClient.get<ApiResponse<ExpenseCategoriesListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createExpenseCategory(input: ExpenseCategoryMutationInput): Promise<ExpenseCategoryData['expenseCategory']> {
  const response = await apiClient.post<ApiResponse<ExpenseCategoryData>>('/expense-categories', input);
  return assertSuccess(response).expenseCategory;
}

export async function updateExpenseCategory(
  categoryId: string,
  input: Partial<ExpenseCategoryMutationInput>,
): Promise<ExpenseCategoryData['expenseCategory']> {
  const response = await apiClient.patch<ApiResponse<ExpenseCategoryData>>(`/expense-categories/${categoryId}`, input);
  return assertSuccess(response).expenseCategory;
}

export async function archiveExpenseCategory(categoryId: string): Promise<ExpenseCategoryData['expenseCategory']> {
  const response = await apiClient.delete<ApiResponse<ExpenseCategoryData>>(`/expense-categories/${categoryId}`);
  return assertSuccess(response).expenseCategory;
}

export interface ExpenseCategoryRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseCategoriesListData {
  expenseCategories: ExpenseCategoryRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface ExpenseCategoryData {
  expenseCategory: ExpenseCategoryRecord;
}

export interface ListExpenseCategoriesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseCategoryMutationInput {
  name: string;
  description?: string | null;
}

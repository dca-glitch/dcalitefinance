import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  ListRecurringInvoicesParams,
  RecurringInvoiceData,
  RecurringInvoiceGenerateData,
  RecurringInvoiceMutationInput,
  RecurringInvoicesListData,
} from '../types/recurring-invoice';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListRecurringInvoicesParams = {}): string {
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
  return queryString ? `/recurring-invoices?${queryString}` : '/recurring-invoices';
}

export async function listRecurringInvoices(params: ListRecurringInvoicesParams = {}): Promise<RecurringInvoicesListData> {
  const response = await apiClient.get<ApiResponse<RecurringInvoicesListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function getRecurringInvoice(recurringInvoiceId: string): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.get<ApiResponse<RecurringInvoiceData>>(`/recurring-invoices/${recurringInvoiceId}`);
  return assertSuccess(response).recurringInvoice;
}

export async function createRecurringInvoice(
  input: RecurringInvoiceMutationInput,
): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.post<ApiResponse<RecurringInvoiceData>>('/recurring-invoices', input);
  return assertSuccess(response).recurringInvoice;
}

export async function updateRecurringInvoice(
  recurringInvoiceId: string,
  input: Partial<RecurringInvoiceMutationInput>,
): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.patch<ApiResponse<RecurringInvoiceData>>(
    `/recurring-invoices/${recurringInvoiceId}`,
    input,
  );
  return assertSuccess(response).recurringInvoice;
}

export async function pauseRecurringInvoice(recurringInvoiceId: string): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.post<ApiResponse<RecurringInvoiceData>>(
    `/recurring-invoices/${recurringInvoiceId}/pause`,
    {},
  );
  return assertSuccess(response).recurringInvoice;
}

export async function resumeRecurringInvoice(recurringInvoiceId: string): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.post<ApiResponse<RecurringInvoiceData>>(
    `/recurring-invoices/${recurringInvoiceId}/resume`,
    {},
  );
  return assertSuccess(response).recurringInvoice;
}

export async function generateRecurringInvoiceNow(
  recurringInvoiceId: string,
): Promise<RecurringInvoiceGenerateData> {
  const response = await apiClient.post<ApiResponse<RecurringInvoiceGenerateData>>(
    `/recurring-invoices/${recurringInvoiceId}/generate-now`,
    {},
  );
  return assertSuccess(response);
}

export async function archiveRecurringInvoice(
  recurringInvoiceId: string,
): Promise<RecurringInvoiceData['recurringInvoice']> {
  const response = await apiClient.delete<ApiResponse<RecurringInvoiceData>>(
    `/recurring-invoices/${recurringInvoiceId}`,
  );
  return assertSuccess(response).recurringInvoice;
}

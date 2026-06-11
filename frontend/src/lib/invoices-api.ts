import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  InvoiceCancelInput,
  InvoiceCreateInput,
  InvoiceData,
  InvoicesListData,
  ListInvoicesParams,
  InvoiceRecord,
} from '../types/invoice';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListInvoicesParams = {}): string {
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
  return queryString ? `/invoices?${queryString}` : '/invoices';
}

export async function listInvoices(params: ListInvoicesParams = {}): Promise<InvoicesListData> {
  const response = await apiClient.get<ApiResponse<InvoicesListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createInvoice(input: InvoiceCreateInput): Promise<InvoiceRecord> {
  const response = await apiClient.post<ApiResponse<InvoiceData>>('/invoices', input);
  return assertSuccess(response).invoice;
}

export async function issueInvoice(invoiceId: string): Promise<InvoiceRecord> {
  const response = await apiClient.post<ApiResponse<InvoiceData>>(`/invoices/${invoiceId}/issue`);
  return assertSuccess(response).invoice;
}

export async function cancelInvoice(invoiceId: string, input: InvoiceCancelInput = {}): Promise<InvoiceRecord> {
  const response = await apiClient.post<ApiResponse<InvoiceData>>(`/invoices/${invoiceId}/cancel`, input);
  return assertSuccess(response).invoice;
}

export async function archiveInvoice(invoiceId: string): Promise<InvoiceRecord> {
  const response = await apiClient.delete<ApiResponse<InvoiceData>>(`/invoices/${invoiceId}`);
  return assertSuccess(response).invoice;
}

import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  ListPaymentsParams,
  PaymentCreateInput,
  PaymentData,
  PaymentRecord,
  PaymentReverseInput,
  PaymentsListData,
} from '../types/payment';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListPaymentsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.invoiceId) {
    searchParams.set('invoiceId', params.invoiceId);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `/payments?${queryString}` : '/payments';
}

export async function listPayments(params: ListPaymentsParams = {}): Promise<PaymentsListData> {
  const response = await apiClient.get<ApiResponse<PaymentsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createPayment(input: PaymentCreateInput): Promise<PaymentRecord> {
  const response = await apiClient.post<ApiResponse<PaymentData>>('/payments', input);
  return assertSuccess(response).payment;
}

export async function reversePayment(paymentId: string, input: PaymentReverseInput = {}): Promise<PaymentRecord> {
  const response = await apiClient.post<ApiResponse<PaymentData>>(`/payments/${paymentId}/reverse`, input);
  return assertSuccess(response).payment;
}

import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  BillAttachmentData,
  BillAttachmentsListData,
  BillData,
  BillMutationInput,
  BillsListData,
  ListBillsParams,
} from '../types/bill';
import type { FileAttachmentRecord } from '../types/file-attachment';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListBillsParams = {}): string {
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
  return queryString ? `/bills?${queryString}` : '/bills';
}

export async function listBills(params: ListBillsParams = {}): Promise<BillsListData> {
  const response = await apiClient.get<ApiResponse<BillsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createBill(input: BillMutationInput): Promise<BillData['bill']> {
  const response = await apiClient.post<ApiResponse<BillData>>('/bills', input);
  return assertSuccess(response).bill;
}

export async function updateBill(billId: string, input: Partial<BillMutationInput>): Promise<BillData['bill']> {
  const response = await apiClient.patch<ApiResponse<BillData>>(`/bills/${billId}`, input);
  return assertSuccess(response).bill;
}

export async function archiveBill(billId: string): Promise<BillData['bill']> {
  const response = await apiClient.delete<ApiResponse<BillData>>(`/bills/${billId}`);
  return assertSuccess(response).bill;
}

export async function markBillPaid(billId: string): Promise<BillData['bill']> {
  const response = await apiClient.post<ApiResponse<BillData>>(`/bills/${billId}/mark-paid`, {});
  return assertSuccess(response).bill;
}

export async function voidBill(billId: string): Promise<BillData['bill']> {
  const response = await apiClient.post<ApiResponse<BillData>>(`/bills/${billId}/void`, {});
  return assertSuccess(response).bill;
}

export async function listBillAttachments(billId: string): Promise<BillAttachmentsListData> {
  const response = await apiClient.get<ApiResponse<BillAttachmentsListData>>(`/bills/${billId}/attachments`);
  return assertSuccess(response);
}

export async function uploadBillAttachment(billId: string, file: File): Promise<FileAttachmentRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<BillAttachmentData>>(`/bills/${billId}/attachments`, formData);
  return assertSuccess(response).attachment;
}

export async function deleteBillAttachment(billId: string, attachmentId: string): Promise<FileAttachmentRecord> {
  const response = await apiClient.delete<ApiResponse<BillAttachmentData>>(`/bills/${billId}/attachments/${attachmentId}`);
  return assertSuccess(response).attachment;
}

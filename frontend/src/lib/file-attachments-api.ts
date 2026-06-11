import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { FileAttachmentData, FileAttachmentRecord, FileAttachmentsListData } from '../types/file-attachment';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

async function uploadAttachment(path: string, file: File): Promise<FileAttachmentRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<FileAttachmentData>>(path, formData);
  return assertSuccess(response).attachment;
}

export async function listPaymentAttachments(paymentId: string): Promise<FileAttachmentsListData> {
  const response = await apiClient.get<ApiResponse<FileAttachmentsListData>>(`/payments/${paymentId}/attachments`);
  return assertSuccess(response);
}

export async function uploadPaymentAttachment(paymentId: string, file: File): Promise<FileAttachmentRecord> {
  return uploadAttachment(`/payments/${paymentId}/attachments`, file);
}

export async function deletePaymentAttachment(paymentId: string, attachmentId: string): Promise<FileAttachmentRecord> {
  const response = await apiClient.delete<ApiResponse<FileAttachmentData>>(
    `/payments/${paymentId}/attachments/${attachmentId}`,
  );
  return assertSuccess(response).attachment;
}

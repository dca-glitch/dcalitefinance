import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  GenerateInvoicePdfResponseData,
  InvoiceDocumentRecord,
  InvoiceDocumentsResponseData,
} from '../types/invoice-document';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function listInvoiceDocuments(invoiceId: string): Promise<InvoiceDocumentRecord[]> {
  const response = await apiClient.get<ApiResponse<InvoiceDocumentsResponseData>>(`/invoices/${invoiceId}/documents`);
  return assertSuccess(response).documents;
}

export async function generateInvoicePdf(invoiceId: string): Promise<InvoiceDocumentRecord> {
  const response = await apiClient.post<ApiResponse<GenerateInvoicePdfResponseData>>(
    `/invoices/${invoiceId}/generate-pdf`,
    {},
  );
  return assertSuccess(response).attachment;
}

import type { FileAttachmentRecord } from './file-attachment';

export type InvoiceDocumentRecord = FileAttachmentRecord;

export interface InvoiceDocumentsResponseData {
  documents: InvoiceDocumentRecord[];
}

export interface GenerateInvoicePdfResponseData {
  attachment: InvoiceDocumentRecord;
}

export type FileAttachmentEntityType = 'PAYMENT' | 'BILL' | 'INVOICE';

export interface FileAttachmentRecord {
  id: string;
  entityType: FileAttachmentEntityType;
  entityId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  documentLink: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export interface FileAttachmentsListData {
  attachments: FileAttachmentRecord[];
}

export interface FileAttachmentData {
  attachment: FileAttachmentRecord;
}

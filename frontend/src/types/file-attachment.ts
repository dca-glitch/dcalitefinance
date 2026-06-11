export type FileAttachmentEntityType = 'PAYMENT' | 'BILL';

export interface FileAttachmentRecord {
  id: string;
  entityType: FileAttachmentEntityType;
  entityId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  uploadedByUserId: string;
  createdAt: string;
}

export interface FileAttachmentsListData {
  attachments: FileAttachmentRecord[];
}

export interface FileAttachmentData {
  attachment: FileAttachmentRecord;
}

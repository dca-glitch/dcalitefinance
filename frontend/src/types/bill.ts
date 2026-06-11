import type { FileAttachmentRecord } from './file-attachment';

export type BillStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'ARCHIVED';

export interface BillReference {
  id: string;
  name: string;
}

export interface BillRecord {
  id: string;
  vendorId: string | null;
  vendor: BillReference | null;
  categoryId: string | null;
  category: BillReference | null;
  billNumber: string | null;
  billDate: string;
  dueDate: string | null;
  status: BillStatus;
  amountMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BillsListData {
  bills: BillRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface BillData {
  bill: BillRecord;
}

export interface ListBillsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface BillMutationInput {
  vendorId?: string | null;
  categoryId?: string | null;
  billNumber?: string | null;
  billDate: string;
  dueDate?: string | null;
  status?: Exclude<BillStatus, 'ARCHIVED'>;
  amountMinor: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
}

export interface BillAttachmentsListData {
  attachments: FileAttachmentRecord[];
}

export interface BillAttachmentData {
  attachment: FileAttachmentRecord;
}

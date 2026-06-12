export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'ARCHIVED';

export interface InvoiceReference {
  id: string;
  name: string;
}

export interface InvoiceLineServiceItemReference {
  id: string;
  name: string;
}

export interface InvoiceLineRecord {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: InvoiceLineServiceItemReference | null;
  createdAt: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceSequence: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  clientId: string | null;
  client: InvoiceReference | null;
  projectId: string | null;
  project: InvoiceReference | null;
  notes: string | null;
  terms: string | null;
  taxPercent: number;
  taxAmountMinor: number;
  discountMinor: number;
  subtotalMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  balanceDueMinor: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface InvoiceRecord extends InvoiceListItem {
  lines: InvoiceLineRecord[];
}

export interface InvoicesListData {
  invoices: InvoiceListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface InvoiceData {
  invoice: InvoiceRecord;
}

export interface InvoicePreviewData {
  invoice: InvoiceRecord;
}

export interface ListInvoicesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  serviceItemId?: string | null;
}

export interface InvoiceCreateInput {
  issueDate: string;
  dueDate: string;
  clientId?: string | null;
  projectId?: string | null;
  notes?: string | null;
  terms?: string | null;
  taxPercent?: number | null;
  discountMinor?: number | null;
  lines: InvoiceLineInput[];
}

export interface InvoiceUpdateInput extends InvoiceCreateInput {}

export interface InvoiceCancelInput {
  reason?: string | null;
}

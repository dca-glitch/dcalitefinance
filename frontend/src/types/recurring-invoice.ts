import type { InvoiceRecord } from './invoice';

export type RecurringInvoiceFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type RecurringInvoiceStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type RecurringInvoiceRunStatus = 'SUCCESS' | 'SKIPPED' | 'FAILED';

export interface RecurringInvoiceReference {
  id: string;
  name: string;
}

export interface RecurringInvoiceLineServiceItemReference {
  id: string;
  name: string;
}

export interface RecurringInvoiceLineRecord {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  serviceItemId: string | null;
  serviceItem: RecurringInvoiceLineServiceItemReference | null;
  createdAt: string;
}

export interface RecurringInvoiceListItem {
  id: string;
  clientId: string | null;
  client: RecurringInvoiceReference | null;
  projectId: string | null;
  project: RecurringInvoiceReference | null;
  status: RecurringInvoiceStatus;
  frequency: RecurringInvoiceFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunDate: string | null;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RecurringInvoiceRecord extends RecurringInvoiceListItem {
  lines: RecurringInvoiceLineRecord[];
}

export interface RecurringInvoicesListData {
  recurringInvoices: RecurringInvoiceListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface RecurringInvoiceData {
  recurringInvoice: RecurringInvoiceRecord;
}

export interface RecurringInvoiceRunRecord {
  id: string;
  recurringInvoiceId: string;
  scheduledFor: string;
  generatedInvoiceId: string | null;
  status: RecurringInvoiceRunStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface RecurringInvoiceGenerateData {
  recurringInvoice: RecurringInvoiceRecord;
  run: RecurringInvoiceRunRecord;
  invoice: InvoiceRecord | null;
}

export interface ListRecurringInvoicesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface RecurringInvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  serviceItemId?: string | null;
}

export interface RecurringInvoiceMutationInput {
  clientId?: string | null;
  projectId?: string | null;
  status?: Exclude<RecurringInvoiceStatus, 'ARCHIVED'>;
  frequency: RecurringInvoiceFrequency;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  notes?: string | null;
  terms?: string | null;
  lines: RecurringInvoiceLineInput[];
}

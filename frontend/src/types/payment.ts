import type { InvoiceStatus } from './invoice';

export type PaymentStatus = 'POSTED' | 'REVERSED';

export interface PaymentInvoiceReference {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paidAmountMinor: number;
  balanceDueMinor: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoice: PaymentInvoiceReference;
  amountMinor: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsListData {
  payments: PaymentRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface PaymentData {
  payment: PaymentRecord;
}

export interface ListPaymentsParams {
  invoiceId?: string;
  page?: number;
  limit?: number;
}

export interface PaymentCreateInput {
  invoiceId: string;
  amountMinor: number;
  paymentDate: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

export interface PaymentReverseInput {
  reason?: string | null;
}

export type IssuerProfileCurrencyCode = 'USD' | 'IDR' | 'EUR' | 'GBP' | 'AUD' | 'SGD';

export const issuerProfileCurrencyOptions: IssuerProfileCurrencyCode[] = ['USD', 'IDR', 'EUR', 'GBP', 'AUD', 'SGD'];

export interface IssuerProfileRecord {
  id: string;
  tenantId: string;
  issuerDisplayName: string;
  issuerLegalName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  companyRegistrationNumber: string | null;
  currencyCode: IssuerProfileCurrencyCode;
  defaultInvoiceTerms: string | null;
  defaultPaymentInstructions: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  invoiceFooter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssuerProfileResponseData {
  issuerProfile: IssuerProfileRecord | null;
}

export interface IssuerProfileUpsertInput {
  issuerDisplayName: string;
  issuerLegalName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  companyRegistrationNumber?: string | null;
  currencyCode: IssuerProfileCurrencyCode;
  defaultInvoiceTerms?: string | null;
  defaultPaymentInstructions?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankSwift?: string | null;
  invoiceFooter?: string | null;
}

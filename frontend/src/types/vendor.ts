export interface VendorRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface VendorsListData {
  vendors: VendorRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface VendorData {
  vendor: VendorRecord;
}

export interface ListVendorsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface VendorMutationInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  notes?: string | null;
}

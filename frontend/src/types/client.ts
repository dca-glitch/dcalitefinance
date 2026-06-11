export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface ClientRecord {
  id: string;
  name: string;
  status: ClientStatus;
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

export interface ClientsListData {
  clients: ClientRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface ClientData {
  client: ClientRecord;
}

export interface ListClientsParams {
  search?: string;
  status?: ClientStatus;
  page?: number;
  limit?: number;
}

export interface ClientMutationInput {
  name: string;
  status?: Exclude<ClientStatus, 'ARCHIVED'>;
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

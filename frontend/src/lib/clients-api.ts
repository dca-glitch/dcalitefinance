import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { ClientData, ClientMutationInput, ClientsListData, ListClientsParams } from '../types/client';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListClientsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `/clients?${queryString}` : '/clients';
}

export async function listClients(params: ListClientsParams = {}): Promise<ClientsListData> {
  const response = await apiClient.get<ApiResponse<ClientsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createClient(input: ClientMutationInput): Promise<ClientData['client']> {
  const response = await apiClient.post<ApiResponse<ClientData>>('/clients', input);
  return assertSuccess(response).client;
}

export async function updateClient(clientId: string, input: Partial<ClientMutationInput>): Promise<ClientData['client']> {
  const response = await apiClient.patch<ApiResponse<ClientData>>(`/clients/${clientId}`, input);
  return assertSuccess(response).client;
}

export async function archiveClient(clientId: string): Promise<ClientData['client']> {
  const response = await apiClient.delete<ApiResponse<ClientData>>(`/clients/${clientId}`);
  return assertSuccess(response).client;
}

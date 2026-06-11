import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { ListServiceItemsParams, ServiceItemData, ServiceItemMutationInput, ServiceItemsListData } from '../types/service-item';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.error.message);
  return response.data;
}

function buildQuery(params: ListServiceItemsParams = {}): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const queryString = searchParams.toString();
  return queryString ? `/service-items?${queryString}` : '/service-items';
}

export async function listServiceItems(params: ListServiceItemsParams = {}): Promise<ServiceItemsListData> {
  const response = await apiClient.get<ApiResponse<ServiceItemsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createServiceItem(input: ServiceItemMutationInput): Promise<ServiceItemData['serviceItem']> {
  const response = await apiClient.post<ApiResponse<ServiceItemData>>('/service-items', input);
  return assertSuccess(response).serviceItem;
}

export async function updateServiceItem(serviceItemId: string, input: Partial<ServiceItemMutationInput>): Promise<ServiceItemData['serviceItem']> {
  const response = await apiClient.patch<ApiResponse<ServiceItemData>>(`/service-items/${serviceItemId}`, input);
  return assertSuccess(response).serviceItem;
}

export async function archiveServiceItem(serviceItemId: string): Promise<ServiceItemData['serviceItem']> {
  const response = await apiClient.delete<ApiResponse<ServiceItemData>>(`/service-items/${serviceItemId}`);
  return assertSuccess(response).serviceItem;
}

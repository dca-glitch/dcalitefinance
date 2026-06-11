import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { ListVendorsParams, VendorData, VendorMutationInput, VendorsListData } from '../types/vendor';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListVendorsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `/vendors?${queryString}` : '/vendors';
}

export async function listVendors(params: ListVendorsParams = {}): Promise<VendorsListData> {
  const response = await apiClient.get<ApiResponse<VendorsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createVendor(input: VendorMutationInput): Promise<VendorData['vendor']> {
  const response = await apiClient.post<ApiResponse<VendorData>>('/vendors', input);
  return assertSuccess(response).vendor;
}

export async function updateVendor(vendorId: string, input: Partial<VendorMutationInput>): Promise<VendorData['vendor']> {
  const response = await apiClient.patch<ApiResponse<VendorData>>(`/vendors/${vendorId}`, input);
  return assertSuccess(response).vendor;
}

export async function archiveVendor(vendorId: string): Promise<VendorData['vendor']> {
  const response = await apiClient.delete<ApiResponse<VendorData>>(`/vendors/${vendorId}`);
  return assertSuccess(response).vendor;
}

import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type {
  IssuerProfileRecord,
  IssuerProfileResponseData,
  IssuerProfileUpsertInput,
} from '../types/issuer-profile';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function getIssuerProfile(): Promise<IssuerProfileRecord | null> {
  const response = await apiClient.get<ApiResponse<IssuerProfileResponseData>>('/issuer-profile');
  return assertSuccess(response).issuerProfile;
}

export async function upsertIssuerProfile(input: IssuerProfileUpsertInput): Promise<IssuerProfileRecord> {
  const response = await apiClient.put<ApiResponse<IssuerProfileResponseData>>('/issuer-profile', input);
  const data = assertSuccess(response);

  if (!data.issuerProfile) {
    throw new Error('Issuer profile was not returned by the server');
  }

  return data.issuerProfile;
}

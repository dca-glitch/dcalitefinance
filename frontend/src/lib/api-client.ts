import { API_BASE_URL } from '../config/env';
import { getAccessToken } from './auth-storage';
import type { ApiErrorResponse, ApiResponse } from '../types/api';

type JsonRequestBody = unknown;
type UnauthorizedHandler = (() => void) | null;

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  body?: JsonRequestBody;
  token?: string | null;
  headers?: HeadersInit;
}

let unauthorizedHandler: UnauthorizedHandler = null;

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/api/v1${normalizedPath}`;
}

function isJsonResponse(contentType: string | null): boolean {
  return Boolean(contentType && contentType.includes('application/json'));
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeError(status: number, payload: unknown): Error {
  if (typeof payload === 'object' && payload !== null) {
    const response = payload as Partial<ApiErrorResponse> & { message?: unknown };
    const message =
      (typeof response.error?.message === 'string' && response.error.message) ||
      (typeof response.message === 'string' && response.message) ||
      `Request failed with status ${status}`;
    return new Error(message);
  }

  if (typeof payload === 'string' && payload.trim().length > 0) {
    return new Error(payload);
  }

  return new Error(`Request failed with status ${status}`);
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getAccessToken();
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type');
  const payload = isJsonResponse(contentType) ? (await readResponseBody(response)) : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw normalizeError(response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>('GET', path, options);
  },
  post<T>(path: string, body?: JsonRequestBody, options?: RequestOptions) {
    return request<T>('POST', path, { ...options, body });
  },
  patch<T>(path: string, body?: JsonRequestBody, options?: RequestOptions) {
    return request<T>('PATCH', path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>('DELETE', path, options);
  },
};

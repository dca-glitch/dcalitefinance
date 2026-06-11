import { useSyncExternalStore } from 'react';

const ACCESS_TOKEN_KEY = 'dca_books_lite_access_token';
const AUTH_CHANGE_EVENT = 'dca-books-lite-auth-change';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return token && token.length > 0 ? token : null;
}

export function setAccessToken(token: string): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAccessToken(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

function subscribeToAuthStore(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleAuthChange = () => onStoreChange();

  window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  window.addEventListener('storage', handleAuthChange);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.removeEventListener('storage', handleAuthChange);
  };
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribeToAuthStore, isAuthenticated, () => false);
}

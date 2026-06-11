import type { AuthTenant, AuthUser } from '../types/auth';
import type { StoredSession } from '../types/session';

const SESSION_USER_KEY = 'dca_books_lite_session_user';
const SESSION_TENANTS_KEY = 'dca_books_lite_session_tenants';
const SESSION_ACTIVE_TENANT_KEY = 'dca_books_lite_active_tenant_id';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clearSessionKeys(): void {
  window.localStorage.removeItem(SESSION_USER_KEY);
  window.localStorage.removeItem(SESSION_TENANTS_KEY);
  window.localStorage.removeItem(SESSION_ACTIVE_TENANT_KEY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  return isRecord(value) && typeof value.id === 'string' && typeof value.email === 'string';
}

function isAuthTenant(value: unknown): value is AuthTenant {
  return isRecord(value) && typeof value.id === 'string';
}

function parseJsonValue(rawValue: string | null): { valid: boolean; value: unknown } {
  if (rawValue === null) {
    return { valid: true, value: null };
  }

  try {
    return { valid: true, value: JSON.parse(rawValue) as unknown };
  } catch {
    return { valid: false, value: null };
  }
}

export function getStoredSession(): StoredSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const userResult = parseJsonValue(window.localStorage.getItem(SESSION_USER_KEY));
  const tenantsResult = parseJsonValue(window.localStorage.getItem(SESSION_TENANTS_KEY));

  if (!userResult.valid || !tenantsResult.valid) {
    clearSessionKeys();
    return null;
  }

  const activeTenantId = window.localStorage.getItem(SESSION_ACTIVE_TENANT_KEY);

  if (!isAuthUser(userResult.value) || !Array.isArray(tenantsResult.value)) {
    clearSessionKeys();
    return null;
  }

  if (!tenantsResult.value.every(isAuthTenant)) {
    clearSessionKeys();
    return null;
  }

  if (activeTenantId !== null && activeTenantId.length === 0) {
    clearSessionKeys();
    return null;
  }

  return {
    user: userResult.value,
    tenants: tenantsResult.value,
    activeTenantId,
  };
}

export function setStoredSession(session: StoredSession): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session.user));
  window.localStorage.setItem(SESSION_TENANTS_KEY, JSON.stringify(session.tenants));

  if (session.activeTenantId) {
    window.localStorage.setItem(SESSION_ACTIVE_TENANT_KEY, session.activeTenantId);
  } else {
    window.localStorage.removeItem(SESSION_ACTIVE_TENANT_KEY);
  }
}

export function setStoredActiveTenantId(activeTenantId: string | null): void {
  if (!canUseStorage()) {
    return;
  }

  if (activeTenantId) {
    window.localStorage.setItem(SESSION_ACTIVE_TENANT_KEY, activeTenantId);
  } else {
    window.localStorage.removeItem(SESSION_ACTIVE_TENANT_KEY);
  }
}

export function clearStoredSession(): void {
  if (!canUseStorage()) {
    return;
  }

  clearSessionKeys();
}

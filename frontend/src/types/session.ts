import type { AuthTenant, AuthUser } from './auth';

export interface StoredSession {
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenantId: string | null;
}

export interface AuthSession extends StoredSession {
  accessToken: string | null;
  isAuthenticated: boolean;
}

export interface ActiveTenantState {
  activeTenantId: string | null;
  activeTenant: AuthTenant | null;
}

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, setUnauthorizedHandler } from '../lib/api-client';
import { clearAccessToken, getAccessToken, setAccessToken } from '../lib/auth-storage';
import { clearStoredSession, getStoredSession, setStoredActiveTenantId, setStoredSession } from '../lib/session-storage';
import type { ApiResponse } from '../types/api';
import type { AuthTenant, AuthUser, LoginResponse } from '../types/auth';
import type { AuthSession } from '../types/session';

interface AuthContextValue extends AuthSession {
  activeTenant: AuthTenant | null;
  isHydrated: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveTenantId: (activeTenantId: string | null) => void;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenantId: string | null;
  isHydrated: boolean;
  isLoggingIn: boolean;
  authError: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  tenants: [],
  activeTenantId: null,
  isHydrated: false,
  isLoggingIn: false,
  authError: null,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function pickActiveTenantId(tenants: AuthTenant[], preferredTenantId: string | null): string | null {
  if (preferredTenantId && tenants.some((tenant) => tenant.id === preferredTenantId)) {
    return preferredTenantId;
  }

  return tenants[0]?.id ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  function clearAuthState(options?: { hydrated?: boolean; preserveError?: boolean }) {
    clearAccessToken();
    clearStoredSession();

    setState({
      accessToken: null,
      user: null,
      tenants: [],
      activeTenantId: null,
      isHydrated: options?.hydrated ?? true,
      isLoggingIn: false,
      authError: options?.preserveError ? state.authError : null,
    });
  }

  useEffect(() => {
    const accessToken = getAccessToken();
    const storedSession = getStoredSession();

    if (!accessToken || !storedSession) {
      clearAuthState({ hydrated: true });
      return;
    }

    const activeTenantId = pickActiveTenantId(storedSession.tenants, storedSession.activeTenantId);

    setStoredSession({
      ...storedSession,
      activeTenantId,
    });

    setState({
      accessToken,
      user: storedSession.user,
      tenants: storedSession.tenants,
      activeTenantId,
      isHydrated: true,
      isLoggingIn: false,
      authError: null,
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthState({ hydrated: true });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [state.authError]);

  async function login(email: string, password: string): Promise<void> {
    setState((current) => ({
      ...current,
      isLoggingIn: true,
      authError: null,
    }));

    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (!response.success) {
        throw new Error(response.error.message);
      }

      const nextTenants = Array.isArray(response.data.tenants) ? response.data.tenants : [];
      const previousTenantId = getStoredSession()?.activeTenantId ?? null;
      const activeTenantId = pickActiveTenantId(nextTenants, previousTenantId);

      setAccessToken(response.data.accessToken);
      setStoredSession({
        user: response.data.user,
        tenants: nextTenants,
        activeTenantId,
      });

      setState({
        accessToken: response.data.accessToken,
        user: response.data.user,
        tenants: nextTenants,
        activeTenantId,
        isHydrated: true,
        isLoggingIn: false,
        authError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';

      clearAccessToken();
      clearStoredSession();

      setState({
        accessToken: null,
        user: null,
        tenants: [],
        activeTenantId: null,
        isHydrated: true,
        isLoggingIn: false,
        authError: message,
      });

      throw error;
    }
  }

  function logout(): void {
    clearAuthState({ hydrated: true });
  }

  function updateActiveTenantId(nextTenantId: string | null): void {
    setState((current) => {
      const resolvedTenantId = pickActiveTenantId(current.tenants, nextTenantId);
      setStoredActiveTenantId(resolvedTenantId);

      return {
        ...current,
        activeTenantId: resolvedTenantId,
      };
    });
  }

  const activeTenant = state.tenants.find((tenant) => tenant.id === state.activeTenantId) ?? null;
  const user = state.user;

  return (
    <AuthContext.Provider
      value={{
        accessToken: state.accessToken,
        user,
        tenants: state.tenants,
        activeTenantId: state.activeTenantId,
        activeTenant,
        isAuthenticated: Boolean(state.accessToken && user),
        isHydrated: state.isHydrated,
        isLoggingIn: state.isLoggingIn,
        authError: state.authError,
        login,
        logout,
        setActiveTenantId: updateActiveTenantId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

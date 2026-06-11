export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  status?: string;
  [key: string]: unknown;
}

export interface AuthTenant {
  id: string;
  name?: string;
  slug?: string;
  membershipStatus?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  tenants: AuthTenant[];
}

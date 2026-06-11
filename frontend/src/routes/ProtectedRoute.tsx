import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '../lib/auth-storage';

export function ProtectedRoute() {
  const location = useLocation();
  const authenticated = useIsAuthenticated();

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

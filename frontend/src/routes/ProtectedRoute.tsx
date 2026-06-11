import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/states/LoadingState';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return <LoadingState fullscreen message="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

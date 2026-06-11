import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/states/LoadingState';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { ClientsPage } from '../pages/ClientsPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

function RouteLoading() {
  return <LoadingState fullscreen message="Restoring your session..." />;
}

function RootRedirect({ isAuthenticated }: { isAuthenticated: boolean }) {
  return <Navigate to={isAuthenticated ? '/app/dashboard' : '/login'} replace />;
}

export function AppRoutes() {
  const { isAuthenticated, isHydrated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isHydrated ? <RootRedirect isAuthenticated={isAuthenticated} /> : <RouteLoading />} />
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            isHydrated ? (
              isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />
            ) : (
              <RouteLoading />
            )
          }
        />
      </Route>
      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

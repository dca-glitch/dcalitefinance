import { Navigate, Route, Routes } from 'react-router-dom';
import { useIsAuthenticated } from '../lib/auth-storage';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

function RootRedirect({ isAuthenticated }: { isAuthenticated: boolean }) {
  return <Navigate to={isAuthenticated ? '/app/dashboard' : '/login'} replace />;
}

export function AppRoutes() {
  const authenticated = useIsAuthenticated();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect isAuthenticated={authenticated} />} />
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={authenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />}
        />
      </Route>
      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

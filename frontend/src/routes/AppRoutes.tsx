import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/states/LoadingState';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { ClientsPage } from '../pages/ClientsPage';
import { VendorsPage } from '../pages/VendorsPage';
import { ExpenseCategoriesPage } from '../pages/ExpenseCategoriesPage';
import { BillsPage } from '../pages/BillsPage';
import { IssuerProfilePage } from '../pages/IssuerProfilePage';
import { RecurringInvoicesPage } from '../pages/RecurringInvoicesPage';
import { ServiceItemsPage } from '../pages/ServiceItemsPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { LoginPage } from '../pages/LoginPage';
import { ProjectsPage } from '../pages/ProjectsPage';
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
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="issuer-profile" element={<IssuerProfilePage />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="recurring-invoices" element={<RecurringInvoicesPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="service-items" element={<ServiceItemsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

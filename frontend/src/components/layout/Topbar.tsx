import { useLocation } from 'react-router-dom';
import { getCurrentNavigationItem } from '../../config/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { SessionSummary } from './SessionSummary';
import { TenantSwitcher } from './TenantSwitcher';

export function Topbar() {
  const location = useLocation();
  const { logout } = useAuth();
  const currentItem = getCurrentNavigationItem(location.pathname);

  function handleLogout() {
    logout();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">DCA Books Lite</p>
            <p className="truncate text-lg font-semibold tracking-tight text-slate-50">
              {currentItem?.label ?? 'Workspace'}
            </p>
            <p className="hidden text-sm text-slate-400 sm:block">
              {currentItem?.description ?? 'Secure frontend workspace'}
            </p>
          </div>
        </div>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <TenantSwitcher />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <SessionSummary />
          </div>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

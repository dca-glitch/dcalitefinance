import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function Topbar() {
  const { activeTenant, activeTenantId, logout, setActiveTenantId, tenants, user } = useAuth();

  function handleLogout() {
    logout();
  }

  const userLabel =
    (typeof user?.displayName === 'string' && user.displayName.trim().length > 0 && user.displayName) ||
    (typeof user?.name === 'string' && user.name.trim().length > 0 && user.name) ||
    user?.email ||
    'Signed in user';

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'No active tenant';

  function handleTenantChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setActiveTenantId(event.target.value || null);
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-tight">DCA Books Lite</p>
        <p className="text-sm text-slate-400">{userLabel}</p>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{tenantLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        {tenants.length > 1 ? (
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Tenant
            <select
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-cyan-400"
              onChange={handleTenantChange}
              value={activeTenantId ?? ''}
            >
              {tenants.map((tenant) => {
                const optionLabel =
                  (typeof tenant.name === 'string' && tenant.name.trim().length > 0 && tenant.name) ||
                  (typeof tenant.slug === 'string' && tenant.slug.trim().length > 0 && tenant.slug) ||
                  tenant.id;

                return (
                  <option key={tenant.id} value={tenant.id}>
                    {optionLabel}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <div className="hidden rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 sm:block">
            {tenantLabel}
          </div>
        )}
        <div className="hidden rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 md:block">
          {user?.email ?? 'No email available'}
        </div>
      </div>
      <Button variant="secondary" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
}

import type { ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function TenantSwitcher() {
  const { activeTenant, activeTenantId, setActiveTenantId, tenants } = useAuth();

  function handleTenantChange(event: ChangeEvent<HTMLSelectElement>) {
    setActiveTenantId(event.target.value || null);
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    activeTenant?.id ||
    'No active tenant';

  if (tenants.length <= 1) {
    return (
      <div className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400">
        {tenantLabel}
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
      Tenant
      <select
        aria-label="Active tenant"
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
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
  );
}

import { useAuth } from '../../hooks/useAuth';

export function SessionSummary() {
  const { activeTenant, user } = useAuth();

  const userLabel =
    (typeof user?.displayName === 'string' && user.displayName.trim().length > 0 && user.displayName) ||
    (typeof user?.name === 'string' && user.name.trim().length > 0 && user.name) ||
    user?.email ||
    'Signed in user';

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    activeTenant?.id ||
    'No active tenant';

  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate text-sm font-medium text-slate-100">{userLabel}</p>
      <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500">{tenantLabel}</p>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import type { NavigationItem } from '../../types/navigation';

interface NavItemProps {
  item: NavigationItem;
  onNavigate?: () => void;
}

export function NavItem({ item, onNavigate }: NavItemProps) {
  if (item.status === 'future') {
    return (
      <div
        aria-disabled="true"
        className="rounded-2xl border border-transparent px-4 py-3 text-sm text-slate-500"
        title={item.description}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">{item.label}</span>
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">
            Soon
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
      </div>
    );
  }

  return (
    <NavLink
      className={({ isActive }) =>
        `block rounded-2xl border px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          isActive
            ? 'border-cyan-300/40 bg-cyan-400 text-slate-950'
            : 'border-transparent text-slate-300 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100'
        }`
      }
      onClick={onNavigate}
      to={item.path}
    >
      <div className="font-medium">{item.label}</div>
      <p className="mt-1 text-xs leading-5 text-current/75">{item.description}</p>
    </NavLink>
  );
}

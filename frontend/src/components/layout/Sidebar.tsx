import { sidebarNavigation } from '../../config/navigation';
import { NavItem } from './NavItem';

export function Sidebar() {
  return (
    <aside className="hidden border-r border-slate-800 bg-slate-950/90 lg:block">
      <div className="flex h-full flex-col px-4 py-6 sm:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">DCA Books Lite</p>
          <p className="mt-2 text-sm text-slate-400">App workspace</p>
        </div>

        <nav className="mt-6 space-y-2" aria-label="Sidebar navigation">
          {sidebarNavigation.map((item) => (
            <NavItem item={item} key={item.label} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

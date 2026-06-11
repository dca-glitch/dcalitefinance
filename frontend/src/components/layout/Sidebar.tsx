import { NavLink } from 'react-router-dom';

const futureItems = ['Clients', 'Projects', 'Service Items', 'Invoices', 'Payments'];

export function Sidebar() {
  return (
    <aside className="border-b border-slate-800 bg-slate-950/90 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-4 py-6 sm:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">DCA Books Lite</p>
          <p className="mt-2 text-sm text-slate-400">Frontend foundation</p>
        </div>

        <nav className="mt-6 space-y-1">
          <NavLink
            className={({ isActive }) =>
              `flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
              }`
            }
            to="/app/dashboard"
          >
            Dashboard
          </NavLink>

          <div className="pt-4">
            <p className="px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Soon</p>
            <ul className="mt-3 space-y-1">
              {futureItems.map((item) => (
                <li
                  key={item}
                  className="flex cursor-not-allowed items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-500"
                  aria-disabled="true"
                >
                  {item}
                  <span className="ml-2 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">
                    Soon
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}

import type { ReactNode } from 'react';

interface PageHeaderProps {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-800 bg-slate-900/70 px-6 py-6 shadow-xl shadow-slate-950/20 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">{eyebrow}</p> : null}
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}

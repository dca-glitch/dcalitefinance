import type { PropsWithChildren, ReactNode } from 'react';

interface PageSectionProps {
  actions?: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}

export function PageSection({ actions, children, className = '', description, title }: PropsWithChildren<PageSectionProps>) {
  return (
    <section className={`rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20 sm:p-8 ${className}`.trim()}>
      {title || description || actions ? (
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {title ? <h2 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h2> : null}
            {description ? <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

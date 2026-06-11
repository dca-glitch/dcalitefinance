import type { ReactNode } from 'react';

interface EmptyStateProps {
  action?: ReactNode;
  message: string;
  title: string;
}

export function EmptyState({ action, message, title }: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center">
      <h3 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

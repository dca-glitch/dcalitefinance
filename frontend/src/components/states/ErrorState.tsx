import type { ReactNode } from 'react';

interface ErrorStateProps {
  action?: ReactNode;
  message: string;
  title?: string;
}

export function ErrorState({ action, message, title = 'Something went wrong' }: ErrorStateProps) {
  return (
    <div className="rounded-[2rem] border border-rose-900 bg-rose-950/30 px-6 py-8 text-center">
      <h3 className="text-xl font-semibold tracking-tight text-rose-100">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-rose-200/85">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

import type { PropsWithChildren, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className = '', ...props }: PropsWithChildren<CardProps>) {
  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

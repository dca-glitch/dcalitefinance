import type { PropsWithChildren } from 'react';

interface AppPageProps {
  className?: string;
}

export function AppPage({ children, className = '' }: PropsWithChildren<AppPageProps>) {
  return <div className={`mx-auto flex w-full max-w-6xl flex-col gap-6 ${className}`.trim()}>{children}</div>;
}

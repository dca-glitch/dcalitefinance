interface LoadingStateProps {
  fullscreen?: boolean;
  message?: string;
}

export function LoadingState({ fullscreen = false, message = 'Loading your workspace...' }: LoadingStateProps) {
  const wrapperClassName = fullscreen
    ? 'flex min-h-screen items-center justify-center bg-slate-950 px-6'
    : 'flex min-h-[16rem] items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-900/70 px-6 text-center';

  return (
    <div className={wrapperClassName}>
      <div className="space-y-4">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin" aria-hidden="true" />
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

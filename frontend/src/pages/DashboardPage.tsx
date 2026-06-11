import { Card } from '../components/ui/Card';

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">DCA Books Lite</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Dashboard coming soon</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          This is the protected app placeholder for the next phase.
        </p>
      </Card>
    </div>
  );
}

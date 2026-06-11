import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-slate-100">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">The page you requested does not exist.</p>
        <Link className="mt-6 inline-flex text-sm font-medium text-cyan-400 hover:text-cyan-300" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}

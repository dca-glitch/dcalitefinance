import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { clearAccessToken } from '../../lib/auth-storage';

export function Topbar() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAccessToken();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6 lg:px-8">
      <div>
        <p className="text-lg font-semibold tracking-tight">DCA Books Lite</p>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Frontend shell</p>
      </div>
      <Button variant="secondary" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
}

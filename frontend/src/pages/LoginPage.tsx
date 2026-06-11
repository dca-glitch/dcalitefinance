import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { setAccessToken } from '../lib/auth-storage';
import type { ApiResponse } from '../types/api';
import type { LoginRequest, LoginResponse } from '../types/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: LoginRequest = {
        email: form.email.trim(),
        password: form.password,
      };

      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      setAccessToken(response.data.accessToken);
      navigate('/app/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">DCA Books Lite</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-slate-400">Use your tenant account to continue.</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />

          {error ? (
            <div className="rounded-2xl border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

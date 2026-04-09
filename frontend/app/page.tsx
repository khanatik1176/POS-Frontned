'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './components/ThemeToggle';
import { API_URL } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Invalid username or password');
      localStorage.setItem('accessToken', data.access);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-neutral-50 px-3 py-5 text-neutral-900 sm:px-4 sm:py-6 dark:bg-neutral-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(#d7d7d7_1px,transparent_1px),linear-gradient(90deg,#d7d7d7_1px,transparent_1px)] [background-size:40px_40px] dark:[background-image:linear-gradient(#2f2f2f_1px,transparent_1px),linear-gradient(90deg,#2f2f2f_1px,transparent_1px)]" />
      <div className="relative z-10 w-full max-w-[460px] rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight">Order Control</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Secure access to your monochrome command dashboard</p>
          </div>
          <ThemeToggle />
        </div>
        <form className="grid gap-4" onSubmit={handleLogin}>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Username</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Password</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>
      </div>
    </div>
  );
}

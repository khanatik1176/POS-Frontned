'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Eye, EyeOff, ScanLine, ScrollText, ShieldCheck } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import { LogoMark } from './components/Logo';
import { API_URL } from '@/lib/api';

const FEATURES = [
  { icon: ClipboardList, label: 'Multi-channel order tracking' },
  { icon: ScanLine, label: 'On-device invoice OCR' },
  { icon: ShieldCheck, label: 'Role-based access control' },
  { icon: ScrollText, label: 'Full audit trail' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="grid min-h-screen grid-cols-1 bg-neutral-50 text-neutral-900 lg:grid-cols-2 dark:bg-neutral-950 dark:text-white">
      {/* Brand panel - always dark, regardless of theme; the marketing/identity surface */}
      <div className="relative hidden overflow-hidden bg-neutral-950 px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-pulse rounded-full bg-indigo-500/20 blur-[100px]" style={{ animationDuration: '6s' }} />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] animate-pulse rounded-full bg-cyan-400/15 blur-[120px]" style={{ animationDuration: '8s' }} />

        <div className="relative z-10 flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="text-lg font-semibold tracking-tight text-white">Nexora</span>
        </div>

        <div className="relative z-10">
          <h1 className="mb-4 max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            One control center for every order, invoice, and role.
          </h1>
          <p className="mb-10 max-w-sm text-sm text-neutral-400">
            Nexora unifies multi-channel order fulfillment, AI-assisted invoice capture, and fine-grained access control in a single workspace.
          </p>
          <div className="grid gap-3">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
                  <feature.icon size={15} />
                </span>
                {feature.label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-neutral-600">© {new Date().getFullYear()} Nexora. All rights reserved.</p>
      </div>

      {/* Sign-in panel */}
      <div className="relative flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#d7d7d7_1px,transparent_1px),linear-gradient(90deg,#d7d7d7_1px,transparent_1px)] [background-size:40px_40px] dark:[background-image:linear-gradient(#2f2f2f_1px,transparent_1px),linear-gradient(90deg,#2f2f2f_1px,transparent_1px)] lg:hidden" />

        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle compact />
        </div>

        <div className="relative z-10 w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark size={38} />
            <span className="text-lg font-semibold tracking-tight">Nexora</span>
          </div>

          <h2 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400">Sign in to continue to your workspace.</p>

          <form className="grid gap-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Username</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 pr-11 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import AppShell from '../components/AppShell';
import { getCurrentUser, CurrentUser } from '@/lib/authApi';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    getCurrentUser()
      .then(setUser)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load profile.'));
  }, [router]);

  const initial = (user?.username || '?').charAt(0).toUpperCase();

  return (
    <AppShell title="Profile" subtitle="Your account details">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-neutral-300 bg-white/90 p-6 shadow-panel dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-panelDark">
          {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-2xl font-semibold text-white dark:bg-white dark:text-neutral-950">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-neutral-900 dark:text-white">{user?.username || 'Loading…'}</p>
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{user?.email || 'No email on file'}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/40">
              <UserIcon size={16} className="text-neutral-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">Username</p>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{user?.username || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/40">
              <Mail size={16} className="text-neutral-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">Email</p>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{user?.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/40">
              <ShieldCheck size={16} className="text-neutral-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">Role</p>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {user?.is_superuser ? 'Superadmin' : user?.is_staff ? 'Staff' : 'Standard user'}
                </p>
              </div>
            </div>
            {user?.date_joined && (
              <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/40">
                <BadgeCheck size={16} className="text-neutral-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Member since</p>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

'use client';

import { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/lib/usePermissions';
import { Skeleton } from './Skeleton';

export default function RequireSuperuser({ children }: { children: ReactNode }) {
  const { loading, isSuperuser } = usePermissions();

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-11 w-56 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white/70 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/70">
        <ShieldAlert size={28} className="text-neutral-400" />
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Admins only.</p>
        <p className="text-xs text-neutral-400">This page is restricted to superadmin accounts.</p>
      </div>
    );
  }

  return <>{children}</>;
}

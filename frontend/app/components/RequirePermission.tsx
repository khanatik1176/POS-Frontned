'use client';

import { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/lib/usePermissions';
import { Skeleton } from './Skeleton';

interface Props {
  action: string;
  children: ReactNode;
}

export default function RequirePermission({ action, children }: Props) {
  const { loading, can } = usePermissions();

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!can(action)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white/70 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/70">
        <ShieldAlert size={28} className="text-neutral-400" />
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">You don&apos;t have access to this page.</p>
        <p className="text-xs text-neutral-400">Ask an administrator to grant you access.</p>
      </div>
    );
  }

  return <>{children}</>;
}

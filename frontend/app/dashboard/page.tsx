'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bell, FileText, ScrollText, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Order } from '@/lib/types';
import { InvoiceRecord } from '@/lib/invoiceTypes';
import { AuditLogEntry } from '@/lib/rbacTypes';
import AppShell from '../components/AppShell';
import RequirePermission from '../components/RequirePermission';
import { CardGridSkeleton, Skeleton } from '../components/Skeleton';
import StatusStackedBar, { StatusSegment } from './components/StatusStackedBar';
import RankedBarList, { RankedItem } from './components/RankedBarList';
import TrendBars, { TrendPoint } from './components/TrendBars';
import {
  getPlatformCode,
  getPlatformIcon,
  getPlatformLabel,
  getStatusCode,
  getStatusLabel,
  statusBarColor,
  statusClass,
} from '@/lib/orderHelpers';
import { usePermissions } from '@/lib/usePermissions';
import { listInvoiceRecords } from '@/lib/invoicesApi';
import { fetchAuditLogs, listRoles, listUsers } from '@/lib/rbacApi';

const buildTrend = (list: Order[]): TrendPoint[] => {
  const now = new Date();
  const days: TrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const count = list.filter((o) => {
      const ot = new Date(o.entry_time);
      return ot.getFullYear() === d.getFullYear() && ot.getMonth() === d.getMonth() && ot.getDate() === d.getDate();
    }).length;
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: count });
  }
  return days;
};

const buildPlatformRanking = (list: Order[]): RankedItem[] => {
  const counts = new Map<string, { label: string; code: string; count: number }>();
  list.forEach((o) => {
    const label = getPlatformLabel(o) || 'Unknown';
    const code = getPlatformCode(o);
    const entry = counts.get(label) || { label, code, count: 0 };
    entry.count += 1;
    counts.set(label, entry);
  });
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((entry) => ({ key: entry.label, label: entry.label, value: entry.count, icon: getPlatformIcon(entry.code) }));
};

export default function DashboardPage() {
  const router = useRouter();
  const { loading: permsLoading, isSuperuser, can } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ocrRecords, setOcrRecords] = useState<InvoiceRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [teamCounts, setTeamCounts] = useState<{ users: number; roles: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (!token) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (permsLoading) return;

    let cancelled = false;

    const load = async () => {
      const tasks: Promise<void>[] = [];

      if (can('orders.view')) {
        tasks.push(
          apiFetch<{ results?: Order[] } | Order[]>('/orders/').then((data) => {
            if (!cancelled) setOrders(Array.isArray(data) ? data : (data.results ?? []));
          }),
        );
      }

      if (can('ocr.view')) {
        tasks.push(listInvoiceRecords().then((data) => { if (!cancelled) setOcrRecords(data); }));
      }

      if (isSuperuser) {
        tasks.push(fetchAuditLogs({}).then((data) => { if (!cancelled) setRecentLogs(data.slice(0, 6)); }));
        tasks.push(
          Promise.all([listUsers(), listRoles()]).then(([users, roles]) => {
            if (!cancelled) setTeamCounts({ users: users.length, roles: roles.length });
          }),
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setLoading(false);
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsLoading, isSuperuser]);

  const stats = {
    total: orders.length,
    ordered: orders.filter((o) => getStatusCode(o) === 'ordered').length,
    verified: orders.filter((o) => getStatusCode(o) === 'verified').length,
    completed: orders.filter((o) => getStatusCode(o) === 'completed').length,
    declined: orders.filter((o) => getStatusCode(o) === 'declined').length,
  };

  const statCards = [
    { label: 'Total', value: stats.total },
    { label: 'Ordered', value: stats.ordered },
    { label: 'Verified', value: stats.verified },
    { label: 'Completed', value: stats.completed },
    { label: 'Declined', value: stats.declined },
  ];

  const statusSegments: StatusSegment[] = [
    { key: 'ordered', label: 'Ordered', value: stats.ordered, colorClass: statusBarColor.ordered },
    { key: 'verified', label: 'Verified', value: stats.verified, colorClass: statusBarColor.verified },
    { key: 'completed', label: 'Completed', value: stats.completed, colorClass: statusBarColor.completed },
    { key: 'declined', label: 'Declined', value: stats.declined, colorClass: statusBarColor.declined },
  ];

  const recentOrders = orders.slice(0, 5);
  const pendingOcrReview = ocrRecords.filter((r) => r.has_pending_server_review).length;
  const recentOcrRecords = ocrRecords.slice(0, 5);

  const showOrdersWidgets = can('orders.view');
  const showOcrWidgets = can('ocr.view');
  const nothingToShow = !permsLoading && !showOrdersWidgets && !showOcrWidgets && !isSuperuser;

  return (
    <AppShell title="Dashboard" subtitle="An overview of your order activity.">
      <RequirePermission action="dashboard.view">
        <div className="grid w-full min-w-0 gap-4 md:gap-5">
          {loading ? (
            <>
              <CardGridSkeleton count={4} />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </>
          ) : nothingToShow ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white/70 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/70">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Nothing to show yet.</p>
              <p className="text-xs text-neutral-400">Ask an administrator to grant you access to a page.</p>
            </div>
          ) : (
            <>
              {showOrdersWidgets && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"
                    >
                      <strong className="text-sm">{card.label}</strong>
                      <div className="text-3xl font-extrabold tracking-tight">{card.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {showOrdersWidgets && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Orders by Status</h2>
                    <StatusStackedBar segments={statusSegments} total={stats.total} />
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Orders by Platform</h2>
                    <RankedBarList items={buildPlatformRanking(orders)} emptyLabel="No orders yet." />
                  </div>
                </div>
              )}

              {showOrdersWidgets && (
                <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Orders — Last 7 Days</h2>
                  <TrendBars points={buildTrend(orders)} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {showOrdersWidgets && (
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Recent Orders</h2>
                      <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        View all <ArrowUpRight size={12} />
                      </Link>
                    </div>
                    {recentOrders.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No orders yet.</p>
                    ) : (
                      <div className="grid gap-2">
                        {recentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/40">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{order.customer_name}</p>
                              <p className="text-xs text-neutral-400">{getPlatformLabel(order)}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusClass[getStatusCode(order)]}`}>
                              {getStatusLabel(order)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showOcrWidgets && (
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Invoice OCR</h2>
                      <Link href="/ocr" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        View all <ArrowUpRight size={12} />
                      </Link>
                    </div>
                    <div className="mb-4 flex gap-4">
                      <div>
                        <p className="text-2xl font-extrabold tracking-tight">{ocrRecords.length}</p>
                        <p className="text-xs text-neutral-400">Total records</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold tracking-tight">{pendingOcrReview}</p>
                        <p className="text-xs text-neutral-400">Awaiting server OCR</p>
                      </div>
                    </div>
                    {recentOcrRecords.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No invoice records yet.</p>
                    ) : (
                      <div className="grid gap-2">
                        {recentOcrRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/40">
                            <div className="min-w-0 flex items-center gap-2">
                              <FileText size={14} className="shrink-0 text-neutral-400" />
                              <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {record.fields.vendor_name?.value || `Record #${record.id}`}
                              </p>
                            </div>
                            {!record.notified && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                <Bell size={9} /> Updated
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isSuperuser && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Team</h2>
                      <Link href="/user-management" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        Manage <ArrowUpRight size={12} />
                      </Link>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"><Users size={16} /></span>
                        <div>
                          <p className="text-xl font-extrabold tracking-tight">{teamCounts?.users ?? '—'}</p>
                          <p className="text-xs text-neutral-400">Users</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"><ScrollText size={16} /></span>
                        <div>
                          <p className="text-xl font-extrabold tracking-tight">{teamCounts?.roles ?? '—'}</p>
                          <p className="text-xs text-neutral-400">Roles</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Recent Activity</h2>
                      <Link href="/logs" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        View all <ArrowUpRight size={12} />
                      </Link>
                    </div>
                    {recentLogs.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No activity logged yet.</p>
                    ) : (
                      <div className="grid gap-2">
                        {recentLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-neutral-600 dark:text-neutral-300">
                              <span className="font-medium text-neutral-800 dark:text-neutral-100">{log.username || 'Anonymous'}</span>
                              {' '}{log.method} <span className="font-mono">{log.path}</span>
                            </span>
                            <span className="shrink-0 text-neutral-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </RequirePermission>
    </AppShell>
  );
}

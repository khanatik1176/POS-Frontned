'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Search } from 'lucide-react';
import AppShell from '../components/AppShell';
import RequireSuperuser from '../components/RequireSuperuser';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import { usePagination } from '@/lib/usePagination';
import { exportToExcel } from '@/lib/exportExcel';
import { fetchAuditLogs } from '@/lib/rbacApi';
import { AuditLogEntry, AuditLogFilters } from '@/lib/rbacTypes';

const initialFilters: AuditLogFilters = {
  username: '',
  method: '',
  path: '',
  ip: '',
  date_from: '',
  date_to: '',
};

const statusBadgeClass = (status: number) => {
  if (status >= 500) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (status >= 400) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
};

const methodBadgeClass = (method: string) => {
  switch (method) {
    case 'GET': return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    case 'POST': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'PATCH':
    case 'PUT': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'DELETE': return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    default: return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
  }
};

export default function LogsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, setPage, pageSize, setPageSize, totalPages, paged } = usePagination(logs);

  const load = async (activeFilters: AuditLogFilters) => {
    setLoading(true);
    try {
      setLogs(await fetchAuditLogs(activeFilters));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    load(initialFilters);
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => load(filters), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleExport = () => {
    exportToExcel(
      `audit-logs-${new Date().toISOString().slice(0, 10)}`,
      'Logs',
      [
        { header: 'Timestamp', key: 'timestamp', width: 22 },
        { header: 'User', key: 'user', width: 18 },
        { header: 'IP Address', key: 'ip', width: 16 },
        { header: 'Method', key: 'method', width: 10 },
        { header: 'Endpoint', key: 'path', width: 40 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Duration (ms)', key: 'duration', width: 14 },
      ],
      logs.map((log) => ({
        timestamp: new Date(log.created_at).toLocaleString(),
        user: log.username || 'Anonymous',
        ip: log.ip_address || '',
        method: log.method,
        path: log.path,
        status: log.status_code,
        duration: log.duration_ms ?? '',
      })),
    );
  };

  return (
    <AppShell title="Logs" subtitle="Every API call: who, from where, and what happened.">
      <RequireSuperuser>
        <div className="grid w-full gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-2 dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="relative min-w-[140px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                aria-label="Filter by username"
                placeholder="User"
                value={filters.username}
                onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 bg-white/80 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white"
              />
            </div>

            <select
              aria-label="Filter by HTTP method"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs text-neutral-700 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
            >
              <option value="">Method: All</option>
              {['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <input
              aria-label="Filter by endpoint path"
              placeholder="Endpoint (e.g. /orders/)"
              value={filters.path}
              onChange={(e) => setFilters({ ...filters, path: e.target.value })}
              className="min-w-[160px] flex-1 rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white"
            />

            <input
              aria-label="Filter by IP address"
              placeholder="IP address"
              value={filters.ip}
              onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
              className="w-32 rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white"
            />

            <input
              aria-label="From date"
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white"
            />
            <input
              aria-label="To date"
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white"
            />

            <button
              type="button"
              onClick={() => load(filters)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Download size={12} /> Export
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={10} cols={6} />
          ) : (
            <div className="min-w-0 rounded-2xl border border-neutral-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5 dark:border-neutral-800/60 dark:bg-neutral-900/40">
              <div className="w-full max-w-full overflow-x-auto rounded-xl border border-neutral-200/60 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-950/50">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className="bg-neutral-50/80 dark:bg-neutral-900/50">
                    <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                      {['Timestamp', 'User', 'IP Address', 'Method', 'Endpoint', 'Status', 'Duration'].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((log) => (
                      <tr key={log.id} className="border-b border-neutral-100/80 last:border-b-0 dark:border-neutral-800/40">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-white">{log.username || 'Anonymous'}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">{log.ip_address || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${methodBadgeClass(log.method)}`}>{log.method}</span>
                        </td>
                        <td className="max-w-[320px] truncate px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">{log.path}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(log.status_code)}`}>{log.status_code}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{log.duration_ms !== null ? `${log.duration_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No matching log entries.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={logs.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
              <p className="mt-3 text-xs text-neutral-400">Showing the most recent 1,000 matches. Narrow the filters to see further back.</p>
            </div>
          )}
        </div>
      </RequireSuperuser>
    </AppShell>
  );
}

'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, ScanLine, ScrollText, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { LogoMark } from './Logo';
import { getCurrentUser, CurrentUser } from '@/lib/authApi';
import { usePermissions } from '@/lib/usePermissions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, action: 'dashboard.view' },
  { href: '/orders', label: 'Orders', icon: ClipboardList, action: 'orders.view' },
  { href: '/ocr', label: 'Invoice OCR', icon: ScanLine, action: 'ocr.view' },
];

const ADMIN_NAV_ITEMS = [
  { href: '/user-management', label: 'User Management', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/logs', label: 'Logs', icon: ScrollText },
];

interface Props {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, headerActions, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const { loading: permsLoading, isSuperuser, can } = usePermissions();

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {});
  }, []);

  const visibleNavItems = permsLoading ? [] : NAV_ITEMS.filter((item) => can(item.action));

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebarCollapsed') === '1');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    router.push('/');
  };

  const initial = (user?.username || '?').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white/95 p-4 backdrop-blur transition-all dark:border-neutral-800 dark:bg-neutral-900/95 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div
          className={`mb-6 flex items-center gap-2 px-1 justify-between ${
            collapsed ? 'md:flex-col md:justify-center md:gap-3 md:px-0' : ''
          }`}
        >
          <div className={`flex min-w-0 items-center gap-2.5 ${collapsed ? 'md:justify-center' : ''}`}>
            <LogoMark size={36} />
            <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold tracking-tight">Nexora</p>
              <p className="truncate text-[11px] text-neutral-400">Order &amp; Invoice Operations</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 md:flex dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="grid gap-1">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${collapsed ? 'md:justify-center md:px-0' : ''} ${
                  active
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}

          {isSuperuser && (
            <>
              <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${collapsed ? 'md:justify-center md:px-0' : ''} ${
                      active
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className={`mt-auto rounded-xl bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-400 dark:bg-neutral-950/40 ${collapsed ? 'md:hidden' : ''}`}>
          Signed in as <span className="font-medium text-neutral-600 dark:text-neutral-300">{user?.username || '…'}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 py-3 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/80">
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <ThemeToggle compact />

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-neutral-950"
                aria-label="Account menu"
              >
                {initial}
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close account menu"
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_18px_45px_-20px_rgba(0,0,0,0.35)] dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="border-b border-neutral-100 px-3.5 py-3 dark:border-neutral-800">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{user?.username || 'Loading…'}</p>
                      {user?.email && <p className="truncate text-xs text-neutral-400">{user.email}</p>}
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <UserIcon size={15} /> View Profile
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Save } from 'lucide-react';
import AppShell from '../components/AppShell';
import RequireSuperuser from '../components/RequireSuperuser';
import { Skeleton } from '../components/Skeleton';
import { fetchCapabilities, listRoles, updateRole } from '@/lib/rbacApi';
import { CapabilityPage, Role } from '@/lib/rbacTypes';

export default function SettingsPage() {
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<CapabilityPage[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    Promise.all([fetchCapabilities(), listRoles()])
      .then(([caps, roleList]) => {
        setCapabilities(caps);
        setRoles(roleList);
        if (roleList.length > 0) {
          setSelectedRoleId(roleList[0].id);
          setSelectedActions(new Set(roleList[0].actions));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const selectRole = (roleId: number) => {
    setSelectedRoleId(roleId);
    setSavedMessage('');
    const role = roles.find((r) => r.id === roleId);
    setSelectedActions(new Set(role?.actions || []));
  };

  const toggleAction = (actionKey: string) => {
    setSelectedActions((current) => {
      const next = new Set(current);
      if (next.has(actionKey)) next.delete(actionKey);
      else next.add(actionKey);
      return next;
    });
  };

  const togglePageView = (page: CapabilityPage) => {
    const willEnable = !selectedActions.has(page.view_action);
    setSelectedActions((current) => {
      const next = new Set(current);
      if (willEnable) {
        next.add(page.view_action);
      } else {
        next.delete(page.view_action);
        page.actions.forEach((a) => next.delete(a.key));
      }
      return next;
    });
  };

  const save = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setSavedMessage('');
    try {
      const updated = await updateRole(selectedRoleId, { actions: Array.from(selectedActions) });
      setRoles((current) => current.map((r) => (r.id === updated.id ? updated : r)));
      setSavedMessage('Saved.');
    } catch (err) {
      setSavedMessage(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  return (
    <AppShell title="Settings" subtitle="Control which pages and actions each role can access.">
      <RequireSuperuser>
        <div className="grid w-full gap-5">
          {loading ? (
            <>
              <Skeleton className="h-11 w-64 rounded-xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </>
          ) : roles.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No roles exist yet. Create one on the User Management page first.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Role</label>
                <select
                  value={selectedRoleId ?? ''}
                  onChange={(e) => selectRole(Number(e.target.value))}
                  className="w-full max-w-xs rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {selectedRole?.description && (
                  <p className="mt-1.5 text-xs text-neutral-400">{selectedRole.description}</p>
                )}
              </div>

              <div className="grid gap-4">
                {capabilities.map((page) => {
                  const canViewPage = selectedActions.has(page.view_action);
                  return (
                    <div key={page.page} className="rounded-2xl border border-neutral-200 bg-white/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={canViewPage}
                          onChange={() => togglePageView(page)}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-800"
                        />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{page.label}</span>
                        <span className="text-xs text-neutral-400">Can view this page</span>
                      </label>

                      {page.actions.length > 0 && (
                        <div className={`mt-3 grid gap-2 border-l-2 pl-6 sm:grid-cols-2 ${canViewPage ? 'border-neutral-200 dark:border-neutral-700' : 'border-neutral-100 opacity-40 dark:border-neutral-800'}`}>
                          {page.actions.map((action) => (
                            <label key={action.key} className={`flex items-center gap-2.5 text-sm ${canViewPage ? 'cursor-pointer text-neutral-700 dark:text-neutral-200' : 'cursor-not-allowed text-neutral-400'}`}>
                              <input
                                type="checkbox"
                                disabled={!canViewPage}
                                checked={selectedActions.has(action.key)}
                                onChange={() => toggleAction(action.key)}
                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-800"
                              />
                              {action.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950"
                >
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {savedMessage && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                    <Check size={14} /> {savedMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </RequireSuperuser>
    </AppShell>
  );
}

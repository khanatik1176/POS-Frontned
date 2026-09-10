'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, Trash2, UserX, UserCheck } from 'lucide-react';
import AppShell from '../components/AppShell';
import RequireSuperuser from '../components/RequireSuperuser';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import { usePagination } from '@/lib/usePagination';
import { exportToExcel } from '@/lib/exportExcel';
import { deleteRole, deleteUser, listRoles, listUsers, updateUser } from '@/lib/rbacApi';
import { RbacUser, Role } from '@/lib/rbacTypes';
import CreateUserModal from './components/CreateUserModal';
import RoleFormModal from './components/RoleFormModal';

export default function UserManagementPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [roleModalTarget, setRoleModalTarget] = useState<Role | 'new' | null>(null);

  const { page: userPage, setPage: setUserPage, pageSize: userPageSize, setPageSize: setUserPageSize, totalPages: userTotalPages, paged: pagedUsers } = usePagination(users);
  const { page: rolePage, setPage: setRolePage, pageSize: rolePageSize, setPageSize: setRolePageSize, totalPages: roleTotalPages, paged: pagedRoles } = usePagination(roles);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([listUsers(), listRoles()]);
      setUsers(u);
      setRoles(r);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user: RbacUser, roleId: string) => {
    const updated = await updateUser(user.id, { role: roleId ? Number(roleId) : null });
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
  };

  const toggleActive = async (user: RbacUser) => {
    const updated = await updateUser(user.id, { is_active: !user.is_active });
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
  };

  const removeUser = async (user: RbacUser) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    await deleteUser(user.id);
    setUsers((current) => current.filter((u) => u.id !== user.id));
  };

  const removeRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      setRoles((current) => current.filter((r) => r.id !== role.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role.');
    }
  };

  const exportUsers = () => {
    exportToExcel(
      `users-${new Date().toISOString().slice(0, 10)}`,
      'Users',
      [
        { header: 'Username', key: 'username', width: 22 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Role', key: 'role', width: 18 },
        { header: 'Active', key: 'active', width: 10 },
        { header: 'Joined', key: 'joined', width: 20 },
      ],
      users.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.is_superuser ? 'Superadmin' : u.role_name || 'No role',
        active: u.is_active ? 'Yes' : 'No',
        joined: new Date(u.date_joined).toLocaleString(),
      })),
    );
  };

  const exportRoles = () => {
    exportToExcel(
      `roles-${new Date().toISOString().slice(0, 10)}`,
      'Roles',
      [
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Users', key: 'users', width: 10 },
        { header: 'Actions granted', key: 'actions', width: 40 },
      ],
      roles.map((r) => ({ name: r.name, description: r.description, users: r.user_count, actions: r.actions.join(', ') })),
    );
  };

  return (
    <AppShell title="User Management" subtitle="Create users and roles, and assign access.">
      <RequireSuperuser>
        <div className="w-full">
          <div className="mb-5 inline-flex rounded-xl border border-neutral-300 bg-white/70 p-1 dark:border-neutral-700 dark:bg-neutral-900/70">
            {(['users', 'roles'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                  tab === t ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : tab === 'users' ? (
            <div>
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={exportUsers}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
                >
                  <Download size={12} /> Export
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-neutral-950"
                >
                  <Plus size={12} /> New User
                </button>
              </div>

              <div className="w-full max-w-full overflow-x-auto rounded-xl border border-neutral-200/60 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-950/50">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-neutral-50/80 dark:bg-neutral-900/50">
                    <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                      {['Username', 'Email', 'Role', 'Status', 'Joined', ''].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((u) => (
                      <tr key={u.id} className="border-b border-neutral-100/80 last:border-b-0 dark:border-neutral-800/40">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-white">{u.username}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-300">{u.email || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {u.is_superuser ? (
                            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-950">Superadmin</span>
                          ) : (
                            <select
                              value={u.role ?? ''}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className="rounded-lg border border-neutral-300 bg-white/80 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900/80"
                            >
                              <option value="">No role</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{new Date(u.date_joined).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {!u.is_superuser && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleActive(u)}
                                title={u.is_active ? 'Deactivate' : 'Activate'}
                                className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                              >
                                {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeUser(u)}
                                title="Delete"
                                className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No users yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={userPage} totalPages={userTotalPages} onPageChange={setUserPage} totalItems={users.length} pageSize={userPageSize} onPageSizeChange={setUserPageSize} />
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={exportRoles}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
                >
                  <Download size={12} /> Export
                </button>
                <button
                  type="button"
                  onClick={() => setRoleModalTarget('new')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-neutral-950"
                >
                  <Plus size={12} /> New Role
                </button>
              </div>

              <div className="w-full max-w-full overflow-x-auto rounded-xl border border-neutral-200/60 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-950/50">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-neutral-50/80 dark:bg-neutral-900/50">
                    <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                      {['Name', 'Description', 'Users', 'Access', ''].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRoles.map((r) => (
                      <tr key={r.id} className="border-b border-neutral-100/80 last:border-b-0 dark:border-neutral-800/40">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-white">{r.name}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-neutral-600 dark:text-neutral-300">{r.description || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-300">{r.user_count}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {r.actions.length} capabilit{r.actions.length === 1 ? 'y' : 'ies'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRoleModalTarget(r)}
                              className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRole(r)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No roles yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={rolePage} totalPages={roleTotalPages} onPageChange={setRolePage} totalItems={roles.length} pageSize={rolePageSize} onPageSizeChange={setRolePageSize} />
              <p className="mt-3 text-xs text-neutral-400">
                Page and action access for each role is configured on the Settings page.
              </p>
            </div>
          )}
        </div>

        {showCreateUser && (
          <CreateUserModal
            roles={roles}
            onClose={() => setShowCreateUser(false)}
            onCreated={(user) => {
              setUsers((current) => [user, ...current]);
              setShowCreateUser(false);
            }}
          />
        )}

        {roleModalTarget && (
          <RoleFormModal
            role={roleModalTarget === 'new' ? null : roleModalTarget}
            onClose={() => setRoleModalTarget(null)}
            onSaved={(saved) => {
              setRoles((current) => {
                const exists = current.some((r) => r.id === saved.id);
                return exists ? current.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...current];
              });
              setRoleModalTarget(null);
            }}
          />
        )}
      </RequireSuperuser>
    </AppShell>
  );
}

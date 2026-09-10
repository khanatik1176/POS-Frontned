'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createUser } from '@/lib/rbacApi';
import { RbacUser, Role } from '@/lib/rbacTypes';

interface Props {
  roles: Role[];
  onClose: () => void;
  onCreated: (user: RbacUser) => void;
}

export default function CreateUserModal({ roles, onClose, onCreated }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const user = await createUser({
        username,
        email: email || undefined,
        password,
        role: roleId ? Number(roleId) : null,
      });
      onCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[480px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/95 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">New User</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Username</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Email (optional)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Password</label>
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15">
              <option value="">No role (no access)</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950"
          >
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}

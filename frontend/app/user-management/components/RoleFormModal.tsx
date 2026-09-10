'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createRole, updateRole } from '@/lib/rbacApi';
import { Role } from '@/lib/rbacTypes';

interface Props {
  role: Role | null;
  onClose: () => void;
  onSaved: (role: Role) => void;
}

export default function RoleFormModal({ role, onClose, onSaved }: Props) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = role
        ? await updateRole(role.id, { name, description })
        : await createRole({ name, description, actions: [] });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[480px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/95 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{role ? 'Edit Role' : 'New Role'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:focus:border-white dark:focus:ring-white/15" />
          </div>

          {!role && (
            <p className="text-xs text-neutral-400">
              New roles start with no page/action access. Set that up afterwards on the Settings page.
            </p>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950"
          >
            {saving ? 'Saving…' : role ? 'Save changes' : 'Create Role'}
          </button>
        </form>
      </div>
    </div>
  );
}

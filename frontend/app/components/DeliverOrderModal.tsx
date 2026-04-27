'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Order } from '@/lib/types';
import ReferenceAutocomplete from './ReferenceAutocomplete';

interface Props {
  order: Order;
  onClose: () => void;
  onDelivered: (order: Order) => void;
}

export default function DeliverOrderModal({ order, onClose, onDelivered }: Props) {
  const [reference, setReference] = useState(order.delivered_reference_value || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await apiFetch<Order>(`/orders/${order.id}/deliver/`, {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id, delivered_reference: reference }),
      });
      onDelivered(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deliver order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[560px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">Mark as Delivered</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Add the new reference number for this order.</p>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-3 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <ReferenceAutocomplete
            label="New Reference Number"
            value={reference}
            onChange={setReference}
          />
          <div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950" disabled={saving} type="submit">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}

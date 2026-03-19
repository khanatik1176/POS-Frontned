'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import ReferenceAutocomplete from './ReferenceAutocomplete';

interface Props {
  products: Product[];
  onClose: () => void;
  onCreated: (order: Order) => void;
}

export default function CreateOrderModal({ products, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    customer_name: '',
    url: '',
    platform_type: 'facebook',
    product: '',
    package_type: '',
    quantity: 1,
    payment_method: 'bkash',
    payment_medium: 'online',
    reference_number: '',
    customer_status: 'new',
    previous_reference: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => String(item.id) === String(form.product)),
    [form.product, products],
  );

  const packages = selectedProduct?.packages || [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        product: Number(form.product),
        package_type: Number(form.package_type),
        quantity: Number(form.quantity),
      };

      const data = await apiFetch<Order>('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[900px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight md:text-2xl">Create Order</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Entry time will be saved automatically by the system.</p>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-3 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Customer Name</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">URL</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Platform Type</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.platform_type} onChange={(e) => setForm({ ...form, platform_type: e.target.value })}>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="website">Website</option>
              <option value="tiktok">TikTok</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Product Name</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" required value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value, package_type: '' })}>
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Package Type</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" required value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })}>
              <option value="">Select package</option>
              {packages.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Quantity</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Payment Method</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Payment Medium</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_medium} onChange={(e) => setForm({ ...form, payment_medium: e.target.value })}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="pos">POS</option>
            </select>
          </div>

          <ReferenceAutocomplete
            label="Reference Number"
            value={form.reference_number}
            onChange={(value) => setForm({ ...form, reference_number: value })}
          />

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Customer Status</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.customer_status} onChange={(e) => setForm({ ...form, customer_status: e.target.value })}>
              <option value="new">New</option>
              <option value="renewal">Renewal</option>
            </select>
          </div>

          {form.customer_status === 'renewal' && (
            <ReferenceAutocomplete
              label="Previous Reference"
              value={form.previous_reference}
              onChange={(value) => setForm({ ...form, previous_reference: value })}
            />
          )}

          <div className="md:col-span-2">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Create Order'}
            </button>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}

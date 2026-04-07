'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { OrderListItem, Product } from '@/lib/types';

type CreateOrderModalProps = {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onCreated: (order: OrderListItem) => void;
};

type CreateOrderFormState = {
  customer_name: string;
  url: string;
  platform_type: string;
  product_id: string;
  package_type_name: string;
  quantity: string;
  payment_method: string;
  payment_medium: string;
  reference_number_value: string;
  previous_reference_value: string;
  customer_status: string;
};

const initialForm: CreateOrderFormState = {
  customer_name: '',
  url: '',
  platform_type: '',
  product_id: '',
  package_type_name: '',
  quantity: '1',
  payment_method: '',
  payment_medium: '',
  reference_number_value: '',
  previous_reference_value: '',
  customer_status: 'new',
};

export default function CreateOrderModal({
  open,
  products,
  onClose,
  onCreated,
}: CreateOrderModalProps) {
  const [form, setForm] = useState<CreateOrderFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        customer_name: form.customer_name,
        url: form.url,
        platform_type: form.platform_type,
        product: form.product_id ? Number(form.product_id) : null,
        package_type_name: form.package_type_name,
        quantity: Number(form.quantity),
        payment_method: form.payment_method,
        payment_medium: form.payment_medium,
        reference_number_value: form.reference_number_value,
        previous_reference_value: form.previous_reference_value || null,
        customer_status: form.customer_status,
      };

      const createdOrder = await apiFetch<OrderListItem>('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onCreated(createdOrder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-300 bg-white p-5 text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Create Order</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Add a new order and save it to the dashboard.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Customer Name</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">URL</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Platform</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.platform_type}
              onChange={(e) => setForm({ ...form, platform_type: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Product</label>
            <select
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Package</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.package_type_name}
              onChange={(e) => setForm({ ...form, package_type_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Quantity</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Payment Method</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Payment Medium</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.payment_medium}
              onChange={(e) => setForm({ ...form, payment_medium: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Primary Reference</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.reference_number_value}
              onChange={(e) => setForm({ ...form, reference_number_value: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Previous Reference</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.previous_reference_value}
              onChange={(e) => setForm({ ...form, previous_reference_value: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Customer Status</label>
            <select
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 outline-none dark:border-neutral-700"
              value={form.customer_status}
              onChange={(e) => setForm({ ...form, customer_status: e.target.value })}
            >
              <option value="new">New</option>
              <option value="renewal">Renewal</option>
            </select>
          </div>

          <div className="md:col-span-2 mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
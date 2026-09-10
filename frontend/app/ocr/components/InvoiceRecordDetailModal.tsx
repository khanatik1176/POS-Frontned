'use client';

import { X } from 'lucide-react';
import { FieldOrigin, FieldTemplateItem, InvoiceRecord } from '@/lib/invoiceTypes';

interface Props {
  record: InvoiceRecord;
  fieldTemplate: FieldTemplateItem[];
  onClose: () => void;
}

const originLabel: Record<FieldOrigin, string> = {
  auto: 'Auto-filled',
  manual: 'Manual',
  empty: 'Empty',
  'server-pending': 'Awaiting server OCR',
  'server-filled': 'Filled by server OCR',
  'server-unresolved': 'Unresolved',
};

const originClass: Record<FieldOrigin, string> = {
  auto: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  manual: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  empty: 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500',
  'server-pending': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'server-filled': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'server-unresolved': 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export default function InvoiceRecordDetailModal({ record, fieldTemplate, onClose }: Props) {
  const vendor = record.fields.vendor_name?.value || 'Untitled record';

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[640px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/95 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">#{record.id} · {vendor}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">{new Date(record.created_at).toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {fieldTemplate.map((field) => {
            const value = record.fields[field.key];
            if (!value) return null;
            return (
              <div key={field.key} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-950/40">
                <div className="min-w-0">
                  <p className="text-neutral-400">{field.label}</p>
                  <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">{value.value || '—'}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${originClass[value.origin]}`}>
                  {originLabel[value.origin]}
                </span>
              </div>
            );
          })}
        </div>

        {record.line_items.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Line items</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="pb-1 pr-2">Description</th>
                    <th className="pb-1 pr-2">Qty</th>
                    <th className="pb-1 pr-2">Unit price</th>
                    <th className="pb-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {record.line_items.map((item, idx) => (
                    <tr key={idx} className="text-neutral-700 dark:text-neutral-200">
                      <td className="py-1 pr-2">{item.description || '—'}</td>
                      <td className="py-1 pr-2">{item.quantity || '—'}</td>
                      <td className="py-1 pr-2">{item.unit_price || '—'}</td>
                      <td className="py-1">{item.amount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {record.images.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Images</p>
            <div className="flex flex-wrap gap-2">
              {record.images.map((image) => (
                <span
                  key={image.id}
                  className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                >
                  {image.local_read_status === 'ok' ? 'Read locally' : `Server: ${image.server_status}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

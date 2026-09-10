'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import OcrImageUploader, { UploadedImage } from './OcrImageUploader';
import { submitInvoiceRecord } from '@/lib/invoicesApi';
import { ExtractedField } from '@/lib/ocrFieldMapping';
import { CONFIDENCE_THRESHOLD } from '@/lib/ocrConfig';
import { FieldTemplateItem, FieldValue, LineItem } from '@/lib/invoiceTypes';

const emptyField = (): FieldValue => ({ value: '', origin: 'empty', confidence: null });
const emptyLineItem = (): LineItem => ({ description: '', quantity: '', unit_price: '', amount: '', origin: 'empty' });

interface Props {
  fieldTemplate: FieldTemplateItem[];
  templateLoading: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function OcrEntryModal({ fieldTemplate, templateLoading, onClose, onSubmitted }: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(fieldTemplate.map((item) => [item.key, emptyField()])),
  );
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((current) => ({ ...current, [key]: { value, origin: value ? 'manual' : 'empty', confidence: null } }));
  };

  const handleFieldsExtracted = (extracted: Record<string, ExtractedField>) => {
    setFieldValues((current) => {
      const next = { ...current };
      for (const [key, match] of Object.entries(extracted)) {
        const existing = next[key];
        if (!existing || existing.origin === 'manual') continue;
        if (match.confidence < CONFIDENCE_THRESHOLD) continue;
        if (existing.origin === 'auto' && (existing.confidence ?? 0) >= match.confidence) continue;
        next[key] = { value: match.value, origin: 'auto', confidence: match.confidence };
      }
      return next;
    });
  };

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch, origin: 'manual' } : item)),
    );
  };

  const addLineItem = () => setLineItems((current) => [...current, emptyLineItem()]);
  const removeLineItem = (index: number) => setLineItems((current) => current.filter((_, i) => i !== index));

  const isProcessingImages = useMemo(() => images.some((img) => img.status === 'processing'), [images]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const payloadImages = images
        .filter((img) => img.base64)
        .map((img) => ({
          image_data: img.base64 as string,
          content_type: img.contentType,
          // FR-6 / open question #2: an image still mid-processing at submit
          // time is treated as unreadable-locally and escalated, rather than
          // blocking submission.
          local_read_status: img.status === 'readable' ? ('ok' as const) : ('unreadable' as const),
        }));

      const cleanedLineItems = lineItems.filter((item) => item.description || item.quantity || item.unit_price || item.amount);

      const outcome = await submitInvoiceRecord({
        fields: fieldValues,
        line_items: cleanedLineItems,
        images: payloadImages,
      });

      onSubmitted();
      if (outcome === 'queued') {
        alert("You're offline — the record is queued and will submit automatically once you're back online.");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Submission failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[720px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/95 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">New Invoice Entry</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Scan a receipt and auto-fill the form on-device.</p>
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

        {templateLoading ? (
          <div className="grid gap-5">
            <Skeleton className="h-11 w-56 rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                1. Upload screenshots / photos
              </h3>
              <OcrImageUploader images={images} onChange={setImages} onFieldsExtracted={handleFieldsExtracted} />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                2. Review / complete fields
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fieldTemplate.map((field) => {
                  const current = fieldValues[field.key] || emptyField();
                  return (
                    <div key={field.key}>
                      <label className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
                        {field.label}
                        {current.origin === 'auto' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case text-sky-600 dark:text-sky-400">
                            <CheckCircle2 size={10} /> Auto ({Math.round(current.confidence || 0)}%)
                          </span>
                        )}
                      </label>
                      <input
                        type={field.type === 'date' ? 'date' : 'text'}
                        value={current.value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">3. Line items</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  <Plus size={12} /> Add row
                </button>
              </div>
              <div className="grid gap-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2">
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                      className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/80"
                    />
                    <input
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, { quantity: e.target.value })}
                      className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/80"
                    />
                    <input
                      placeholder="Unit price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, { unit_price: e.target.value })}
                      className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/80"
                    />
                    <input
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateLineItem(idx, { amount: e.target.value })}
                      className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/80"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="flex items-center justify-center text-neutral-400 hover:text-rose-600"
                      aria-label="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {statusMessage && <p className="text-sm text-rose-600">{statusMessage}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950"
            >
              {submitting ? 'Submitting…' : isProcessingImages ? 'Submit (still reading images…)' : 'Submit record'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

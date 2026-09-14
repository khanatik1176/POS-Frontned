'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import OcrImageUploader, { UploadedImage } from './OcrImageUploader';
import { submitInvoiceRecord } from '@/lib/invoicesApi';
import {
  ExtractedField,
  MOBILE_MONEY_FIELD_TEMPLATE,
  extractFields as extractMobileMoneyFields,
  mergeExtractedFields,
} from '@/lib/mobileMoneyFieldMapping';
import { FieldTemplatesByType, FieldValue } from '@/lib/invoiceTypes';

const RECORD_TYPE = 'mobile_money_receipt' as const;

const emptyField = (): FieldValue => ({ value: '', origin: 'empty', confidence: null });

interface Props {
  fieldTemplates: FieldTemplatesByType;
  templateLoading: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function OcrEntryModal({ fieldTemplates, templateLoading, onClose, onSubmitted }: Props) {
  // Fall back to the hardcoded template so the form still renders if the
  // API template request fails or returns an empty mobile-money list.
  const fieldTemplate =
    fieldTemplates[RECORD_TYPE]?.length > 0
      ? fieldTemplates[RECORD_TYPE]
      : MOBILE_MONEY_FIELD_TEMPLATE;

  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(fieldTemplate.map((item) => [item.key, emptyField()])),
  );
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setFieldValues((current) =>
      Object.fromEntries(fieldTemplate.map((item) => [item.key, current[item.key] || emptyField()])),
    );
    // Only re-sync when the template key set changes (API load / fallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldTemplate.map((item) => item.key).join(',')]);

  const blankFields = () =>
    Object.fromEntries(fieldTemplate.map((item) => [item.key, emptyField()]));

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((current) => ({ ...current, [key]: { value, origin: value ? 'manual' : 'empty', confidence: null } }));
  };

  // A new screenshot is a new receipt, so clear what the previous one filled
  // in - otherwise its values survive into the next record.
  const handleImageSelected = () => setFieldValues(blankFields());

  const handleFieldsExtracted = (extracted: Record<string, ExtractedField>) => {
    setFieldValues((current) => {
      const next: Record<string, FieldValue> = {};
      for (const item of fieldTemplate) {
        const existing = current[item.key];
        if (existing?.origin === 'manual' && existing.value) {
          next[item.key] = existing;
          continue;
        }
        const match = extracted[item.key];
        // Any regex-validated extraction is applied. Confidence was already
        // boosted in the mapper; don't drop partial receipts on the threshold.
        next[item.key] = match?.value
          ? { value: match.value, origin: 'auto', confidence: match.confidence }
          : emptyField();
      }
      return next;
    });
  };

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
          local_read_status: img.status === 'readable' ? ('ok' as const) : ('unreadable' as const),
        }));

      const outcome = await submitInvoiceRecord({
        record_type: RECORD_TYPE,
        fields: fieldValues,
        line_items: [],
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
            <h2 className="mb-1 text-xl font-semibold tracking-tight">New Entry</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Scan a mobile money receipt and auto-fill the form on-device.</p>
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

        {templateLoading && fieldTemplates[RECORD_TYPE]?.length === 0 ? (
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
              <OcrImageUploader
                images={images}
                onChange={setImages}
                onFieldsExtracted={handleFieldsExtracted}
                onImageSelected={handleImageSelected}
                extractFields={extractMobileMoneyFields}
                mergeExtractedFields={mergeExtractedFields}
              />
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

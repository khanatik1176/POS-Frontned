import { apiFetch, API_URL } from './api';
import { submitOrQueue } from './offlineSync';
import {
  CreateInvoiceRecordPayload,
  FieldTemplateItem,
  InvoiceImageDetail,
  InvoiceRecord,
} from './invoiceTypes';

export async function fetchFieldTemplate(): Promise<FieldTemplateItem[]> {
  const data = await apiFetch<{ fields: FieldTemplateItem[] }>('/invoices/field-template/');
  return data.fields;
}

export async function listInvoiceRecords(): Promise<InvoiceRecord[]> {
  return apiFetch<InvoiceRecord[]>('/invoices/records/');
}

export async function getInvoiceRecord(id: number): Promise<InvoiceRecord> {
  return apiFetch<InvoiceRecord>(`/invoices/records/${id}/`);
}

export async function markInvoiceRecordSeen(id: number): Promise<InvoiceRecord> {
  return apiFetch<InvoiceRecord>(`/invoices/records/${id}/mark-seen/`, { method: 'POST' });
}

export async function getInvoiceImageDetail(recordId: number, imageId: number): Promise<InvoiceImageDetail> {
  return apiFetch<InvoiceImageDetail>(`/invoices/records/${recordId}/images/${imageId}/`);
}

// Submission is routed through the offline-aware queue (lib/offlineSync.ts)
// rather than apiFetch directly, per FR-11: a submission made while offline
// must be queued and retried, not lost.
export async function submitInvoiceRecord(payload: CreateInvoiceRecordPayload): Promise<'sent' | 'queued'> {
  return submitOrQueue(`${API_URL}/invoices/records/`, payload);
}

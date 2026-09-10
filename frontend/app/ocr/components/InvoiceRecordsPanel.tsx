'use client';

import { useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { Bell, Download, Eye, RefreshCw } from 'lucide-react';
import Pagination from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';
import { usePagination } from '@/lib/usePagination';
import { exportToExcel } from '@/lib/exportExcel';
import { getInvoiceRecord, listInvoiceRecords, markInvoiceRecordSeen } from '@/lib/invoicesApi';
import { FieldTemplateItem, InvoiceRecord } from '@/lib/invoiceTypes';
import InvoiceRecordDetailModal from './InvoiceRecordDetailModal';

interface Props {
  fieldTemplate: FieldTemplateItem[];
  canExport?: boolean;
}

export interface InvoiceRecordsPanelHandle {
  refresh: () => void;
}

const InvoiceRecordsPanel = forwardRef<InvoiceRecordsPanelHandle, Props>(({ fieldTemplate, canExport = true }, ref) => {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<InvoiceRecord | null>(null);
  const { page, setPage, pageSize, setPageSize, totalPages, paged: pagedRecords } = usePagination(records);

  const load = async () => {
    setLoading(true);
    try {
      setRecords(await listInvoiceRecords());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }));

  const viewRecord = async (record: InvoiceRecord) => {
    if (!record.notified) {
      const updated = await markInvoiceRecordSeen(record.id);
      setRecords((current) => current.map((r) => (r.id === updated.id ? updated : r)));
    }
    const fresh = await getInvoiceRecord(record.id);
    setRecords((current) => current.map((r) => (r.id === fresh.id ? fresh : r)));
    setSelectedRecord(fresh);
  };

  const handleExport = () => {
    exportToExcel(
      `invoice-records-${new Date().toISOString().slice(0, 10)}`,
      'Records',
      [
        { header: '#', key: 'id', width: 8 },
        { header: 'Vendor', key: 'vendor', width: 24 },
        { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Total', key: 'total', width: 14 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Submitted', key: 'submitted', width: 20 },
      ],
      records.map((record) => ({
        id: record.id,
        vendor: record.fields.vendor_name?.value || '',
        invoiceNumber: record.fields.invoice_number?.value || '',
        date: record.fields.invoice_date?.value || '',
        total: record.fields.total_amount?.value || '',
        status: !record.notified ? 'Updated' : record.has_pending_server_review ? 'Server review pending' : 'Complete',
        submitted: new Date(record.created_at).toLocaleString(),
      })),
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">My Records</h2>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Download size={12} />
              Export
            </button>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : records.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No records submitted yet.</p>
      ) : (
        <>
          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-neutral-200/60 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-950/50">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-neutral-50/80 dark:bg-neutral-900/50">
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                  {['#', 'Vendor', 'Invoice #', 'Date', 'Total', 'Status', 'Submitted', ''].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((record) => (
                  <tr key={record.id} className="border-b border-neutral-100/80 transition-colors last:border-b-0 hover:bg-neutral-50/80 dark:border-neutral-800/40 dark:hover:bg-neutral-900/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">#{record.id}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-neutral-900 dark:text-white">
                      {record.fields.vendor_name?.value || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {record.fields.invoice_number?.value || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {record.fields.invoice_date?.value || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-white">
                      {record.fields.total_amount?.value || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {!record.notified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <Bell size={10} /> Updated
                        </span>
                      ) : record.has_pending_server_review ? (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          Server review pending
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Complete
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => viewRecord(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={records.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}

      {selectedRecord && (
        <InvoiceRecordDetailModal record={selectedRecord} fieldTemplate={fieldTemplate} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
});

InvoiceRecordsPanel.displayName = 'InvoiceRecordsPanel';

export default InvoiceRecordsPanel;

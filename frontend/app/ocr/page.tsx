'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, WifiOff } from 'lucide-react';
import AppShell from '../components/AppShell';
import RequirePermission from '../components/RequirePermission';
import InvoiceRecordsPanel, { InvoiceRecordsPanelHandle } from './components/InvoiceRecordsPanel';
import OcrEntryModal from './components/OcrEntryModal';
import { fetchFieldTemplate } from '@/lib/invoicesApi';
import { registerServiceWorker } from '@/lib/offlineSync';
import { usePermissions } from '@/lib/usePermissions';
import { FieldTemplateItem } from '@/lib/invoiceTypes';

export default function OcrPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [fieldTemplate, setFieldTemplate] = useState<FieldTemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const recordsPanelRef = useRef<InvoiceRecordsPanelHandle>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    registerServiceWorker();
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [router]);

  useEffect(() => {
    fetchFieldTemplate()
      .then(setFieldTemplate)
      .catch(() => {})
      .finally(() => setTemplateLoading(false));
  }, []);

  const handleSubmitted = () => {
    setShowEntryModal(false);
    recordsPanelRef.current?.refresh();
  };

  const headerActions = (
    <>
      {!isOnline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <WifiOff size={12} /> Offline
        </span>
      )}
      {can('ocr.create') && (
        <button
          type="button"
          onClick={() => setShowEntryModal(true)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-neutral-950"
        >
          <Plus size={16} />
          New Entry
        </button>
      )}
    </>
  );

  return (
    <AppShell title="Invoice OCR" subtitle="Scan a receipt and auto-fill the form on-device." headerActions={headerActions}>
      <RequirePermission action="ocr.view">
      <div className="w-full">
        <InvoiceRecordsPanel ref={recordsPanelRef} fieldTemplate={fieldTemplate} canExport={can('ocr.export')} />
      </div>

      {showEntryModal && (
        <OcrEntryModal
          fieldTemplate={fieldTemplate}
          templateLoading={templateLoading}
          onClose={() => setShowEntryModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
      </RequirePermission>
    </AppShell>
  );
}

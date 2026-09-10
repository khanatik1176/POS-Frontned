'use client';

import { useRef } from 'react';
import { Camera, Download, FileImage, Loader2, X } from 'lucide-react';
import Pagination from '../../components/Pagination';
import { usePagination } from '@/lib/usePagination';
import { exportToExcel } from '@/lib/exportExcel';
import { compressImageToBase64 } from '@/lib/imageUtils';
import { runOcr } from '@/lib/ocrEngine';
import { ExtractedField, extractFields } from '@/lib/ocrFieldMapping';

export type UploadedImage = {
  clientId: string;
  fileName: string;
  previewUrl: string;
  status: 'processing' | 'readable' | 'unreadable' | 'error';
  meanConfidence?: number;
  ocrText: string;
  base64?: string;
  contentType: string;
};

type ImagesUpdater = UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[]);

interface Props {
  images: UploadedImage[];
  onChange: (updater: ImagesUpdater) => void;
  onFieldsExtracted: (extracted: Record<string, ExtractedField>) => void;
}

const statusLabel: Record<UploadedImage['status'], string> = {
  processing: 'Reading…',
  readable: 'Done',
  unreadable: "Couldn't read — will retry on server",
  error: 'Upload failed',
};

const statusClass: Record<UploadedImage['status'], string> = {
  processing: 'text-amber-600 dark:text-amber-400',
  readable: 'text-emerald-600 dark:text-emerald-400',
  unreadable: 'text-rose-600 dark:text-rose-400',
  error: 'text-rose-600 dark:text-rose-400',
};

export default function OcrImageUploader({ images, onChange, onFieldsExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { page, setPage, pageSize, setPageSize, totalPages, paged: pagedImages } = usePagination(images);

  const handleExport = () => {
    exportToExcel(
      `uploaded-images-${new Date().toISOString().slice(0, 10)}`,
      'Images',
      [
        { header: 'File', key: 'file', width: 28 },
        { header: 'Status', key: 'status', width: 30 },
      ],
      images.map((img) => ({ file: img.fileName, status: statusLabel[img.status] })),
    );
  };

  const processFile = async (file: File, clientId: string) => {
    try {
      const compressed = await compressImageToBase64(file);
      onChange((current) =>
        current.map((img) => (img.clientId === clientId ? { ...img, base64: compressed.base64, contentType: compressed.contentType } : img)),
      );
    } catch {
      // Compression failing shouldn't block OCR from still running below.
    }

    try {
      const result = await runOcr(file);
      const text = result.lines.map((line) => line.text).join('\n');
      onChange((current) =>
        current.map((img) =>
          img.clientId === clientId
            ? { ...img, status: result.readable ? 'readable' : 'unreadable', meanConfidence: result.meanConfidence, ocrText: text }
            : img,
        ),
      );
      if (result.readable) {
        onFieldsExtracted(extractFields(result.lines));
      }
    } catch {
      onChange((current) => current.map((img) => (img.clientId === clientId ? { ...img, status: 'error' } : img)));
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newImages: UploadedImage[] = Array.from(fileList).map((file) => ({
      clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name || 'capture.jpg',
      previewUrl: URL.createObjectURL(file),
      status: 'processing',
      ocrText: '',
      contentType: file.type || 'image/jpeg',
    }));
    onChange((current) => [...current, ...newImages]);
    newImages.forEach((img, i) => processFile(Array.from(fileList)[i], img.clientId));
  };

  const removeImage = (clientId: string) => {
    onChange((current) => current.filter((img) => img.clientId !== clientId));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white/70 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-200"
        >
          <FileImage size={16} />
          Upload screenshot / photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Download size={12} />
              Export
            </button>
          </div>
          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white/70 dark:border-neutral-800 dark:bg-neutral-900/70">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-neutral-50/80 dark:bg-neutral-900/50">
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                  <th className="w-16 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Preview</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">File</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="w-12 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400" />
                </tr>
              </thead>
              <tbody>
                {pagedImages.map((img) => (
                  <tr key={img.clientId} className="border-b border-neutral-100/80 last:border-b-0 dark:border-neutral-800/40">
                    <td className="px-3 py-2.5">
                      <img src={img.previewUrl} alt={img.fileName} className="h-11 w-11 rounded-lg object-cover" />
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-neutral-800 dark:text-neutral-100">{img.fileName}</td>
                    <td className={`px-3 py-2.5 text-xs font-medium ${statusClass[img.status]}`}>
                      <span className="flex items-center gap-1.5">
                        {img.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                        {statusLabel[img.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeImage(img.clientId)}
                        className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={images.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
        </div>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
        <Camera size={12} />
        On mobile you can capture directly from the camera.
      </p>
    </div>
  );
}

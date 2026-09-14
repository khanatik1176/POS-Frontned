'use client';

import { useRef } from 'react';
import { Camera, FileImage, Loader2, X } from 'lucide-react';
import { compressImageToBase64 } from '@/lib/imageUtils';
import { runOcr } from '@/lib/ocrEngine';
import { ExtractedField } from '@/lib/ocrFieldMapping';

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
  onImageSelected: () => void;
  extractFields: (lines: { text: string; confidence: number }[]) => Record<string, ExtractedField>;
  mergeExtractedFields?: (
    ...results: Array<Record<string, ExtractedField>>
  ) => Record<string, ExtractedField>;
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

export default function OcrImageUploader({
  images,
  onChange,
  onFieldsExtracted,
  onImageSelected,
  extractFields,
  mergeExtractedFields,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Only the newest upload may write into the form. Without this, replacing
  // an image while its OCR is still running lets the old pass finish last
  // and overwrite the new image's results.
  const latestImageIdRef = useRef<string | null>(null);
  const image = images[0];

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
      const text = [...result.lines, ...result.altLines].map((line) => line.text).join('\n');
      onChange((current) =>
        current.map((img) =>
          img.clientId === clientId
            ? { ...img, status: result.readable ? 'readable' : 'unreadable', meanConfidence: result.meanConfidence, ocrText: text }
            : img,
        ),
      );
      // Apply whatever we could parse even when the image is marked
      // unreadable — empty fields are worse than partial autofill.
      if (latestImageIdRef.current === clientId && (result.lines.length > 0 || result.altLines.length > 0)) {
        const primary = extractFields(result.lines);
        const secondary = extractFields(result.altLines);
        const merged = mergeExtractedFields
          ? mergeExtractedFields(primary, secondary)
          : { ...secondary, ...primary };
        onFieldsExtracted(merged);
      }
    } catch (err) {
      console.error('OCR failed', err);
      onChange((current) => current.map((img) => (img.clientId === clientId ? { ...img, status: 'error' } : img)));
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    // Only one screenshot/photo at a time - a new selection replaces
    // whatever was uploaded before.
    const file = fileList[0];
    const newImage: UploadedImage = {
      clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name || 'capture.jpg',
      previewUrl: URL.createObjectURL(file),
      status: 'processing',
      ocrText: '',
      contentType: file.type || 'image/jpeg',
    };
    latestImageIdRef.current = newImage.clientId;
    onChange((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [newImage];
    });
    onImageSelected();
    processFile(file, newImage.clientId);
  };

  const removeImage = (clientId: string) => {
    latestImageIdRef.current = null;
    onChange((current) => {
      const target = current.find((img) => img.clientId === clientId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((img) => img.clientId !== clientId);
    });
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
          {image ? 'Replace screenshot / photo' : 'Upload screenshot / photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {image && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
          <img src={image.previewUrl} alt={image.fileName} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{image.fileName}</p>
            <p className={`flex items-center gap-1.5 text-xs font-medium ${statusClass[image.status]}`}>
              {image.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
              {statusLabel[image.status]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeImage(image.clientId)}
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
        <Camera size={12} />
        On mobile you can capture directly from the camera.
      </p>
    </div>
  );
}

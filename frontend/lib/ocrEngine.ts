import type { Worker } from 'tesseract.js';
import { OcrLine } from './invoiceTypes';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js');
    // Mobile-money receipts (bKash/Nagad/Rocket) are frequently in Bengali
    // script; invoices are generally English. Load both scripts in one
    // worker rather than branching per record type.
    workerPromise = createWorker('eng+ben');
  }
  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}

export type OcrResult = {
  lines: OcrLine[];
  /** Second OCR pass (upscaled grayscale). Merge extractions with `lines`. */
  altLines: OcrLine[];
  readable: boolean;
  meanConfidence: number;
};

const MIN_WORDS_FOR_READABLE = 3;
const MIN_MEAN_CONFIDENCE = 25;

const OCR_MIN_DIMENSION = 1600;
const OCR_MAX_UPSCALE = 2;

function linesFromRecognizeData(data: {
  lines?: Array<{ text?: string; confidence?: number }>;
  text?: string;
  confidence?: number;
}): OcrLine[] {
  let lines: OcrLine[] = (data.lines || [])
    .map((line) => ({ text: (line.text || '').trim(), confidence: line.confidence ?? 0 }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0 && data.text) {
    lines = data.text
      .split('\n')
      .map((text) => text.trim())
      .filter((text) => text.length > 0)
      .map((text) => ({ text, confidence: data.confidence ?? 0 }));
  }
  return lines;
}

async function prepareImageForOcr(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDim = Math.max(bitmap.width, bitmap.height);
    let scale = 1;
    if (maxDim < OCR_MIN_DIMENSION) {
      scale = Math.min(OCR_MAX_UPSCALE, OCR_MIN_DIMENSION / maxDim);
      if (maxDim < 1200) scale = Math.max(scale, 2);
    }
    if (scale === 1) {
      return file instanceof Blob ? file : new Blob([file], { type: file.type || 'image/png' });
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file instanceof Blob ? file : new Blob([file]);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png');
    });
    return blob || (file instanceof Blob ? file : new Blob([file]));
  } finally {
    bitmap.close();
  }
}

export async function runOcr(file: File | Blob): Promise<OcrResult> {
  const worker = await getWorker();

  // Dual pass: raw color keeps English "TrxID" labels; upscaled grayscale
  // recovers Bengali bottom-grid cells (Transaction ID / Reference).
  const prepared = await prepareImageForOcr(file);
  const [rawResult, preparedResult] = await Promise.all([
    worker.recognize(file),
    worker.recognize(prepared),
  ]);

  const lines = linesFromRecognizeData(rawResult.data);
  const altLines = linesFromRecognizeData(preparedResult.data);

  const allLines = [...lines, ...altLines];
  const wordCount = allLines.reduce(
    (count, line) => count + line.text.split(/\s+/).filter(Boolean).length,
    0,
  );
  const meanConfidence = Math.max(rawResult.data.confidence ?? 0, preparedResult.data.confidence ?? 0);
  const readable = wordCount >= MIN_WORDS_FOR_READABLE && meanConfidence >= MIN_MEAN_CONFIDENCE;

  return { lines, altLines, readable, meanConfidence };
}

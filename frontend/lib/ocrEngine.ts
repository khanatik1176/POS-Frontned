import type { Worker } from 'tesseract.js';
import { OcrLine } from './invoiceTypes';

let workerPromise: Promise<Worker> | null = null;

// Served from public/tessdata (uncompressed .traineddata). Avoids CDN
// failures that silently break Bengali recognition on mobile-money receipts.
const TESSDATA_PATH = '/tessdata';

async function createOcrWorker(): Promise<Worker> {
  const { createWorker } = await import('tesseract.js');
  // Mobile-money receipts (bKash/Nagad/Rocket) are frequently in Bengali
  // script; invoices are generally English. Load both scripts in one
  // worker rather than branching per record type.
  return createWorker(['eng', 'ben'], 1, {
    langPath: TESSDATA_PATH,
    gzip: false,
  });
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((err) => {
      // Clear so the next upload can retry instead of reusing a rejected promise.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // Init may already have failed; nothing left to terminate.
  }
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
const OCR_MAX_UPSCALE = 3;
const CONTRAST = 1.8;

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

function applyGrayscaleContrast(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray = Math.min(255, Math.max(0, (gray - 128) * CONTRAST + 128));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

async function prepareImageForOcr(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDim = Math.max(bitmap.width, bitmap.height);
    let scale = 1;
    if (maxDim < OCR_MIN_DIMENSION) {
      scale = Math.min(OCR_MAX_UPSCALE, OCR_MIN_DIMENSION / maxDim);
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

    // Always grayscale + contrast on the prepared pass (even when already large).
    // Bengali UI glyphs on phone screenshots need the contrast boost more than
    // the raw color pass.
    const imageData = ctx.getImageData(0, 0, width, height);
    applyGrayscaleContrast(imageData.data);
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

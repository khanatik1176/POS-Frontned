import type { Worker } from 'tesseract.js';
import { OcrLine } from './invoiceTypes';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js');
    workerPromise = createWorker('eng');
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
  readable: boolean;
  meanConfidence: number;
};

// FR-6: per-image readability check, separate from per-field confidence.
// An image is "unreadable-locally" if OCR found effectively no usable text.
const MIN_WORDS_FOR_READABLE = 3;
const MIN_MEAN_CONFIDENCE = 25;

export async function runOcr(file: File | Blob): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(file);

  let lines: OcrLine[] = (data.lines || [])
    .map((line) => ({ text: (line.text || '').trim(), confidence: line.confidence ?? 0 }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0 && data.text) {
    // Some builds don't populate structured blocks/lines; fall back to
    // splitting the raw text so field-mapping still has something to match.
    lines = data.text
      .split('\n')
      .map((text) => text.trim())
      .filter((text) => text.length > 0)
      .map((text) => ({ text, confidence: data.confidence ?? 0 }));
  }

  const wordCount = (data.words || []).filter((word) => (word.text || '').trim().length > 0).length
    || lines.reduce((count, line) => count + line.text.split(/\s+/).filter(Boolean).length, 0);
  const meanConfidence = data.confidence ?? 0;
  const readable = wordCount >= MIN_WORDS_FOR_READABLE && meanConfidence >= MIN_MEAN_CONFIDENCE;

  return { lines, readable, meanConfidence };
}

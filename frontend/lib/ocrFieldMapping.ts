import { FieldOrigin, FieldValue, OcrLine } from './invoiceTypes';

// Mirrors backend/invoices/field_mapping.py so client-side and server-side
// fallback extraction apply the same heuristics.
const LABEL_PATTERNS: Record<string, RegExp[]> = {
  invoice_number: [/invoice\s*(no\.?|number|#)/i, /receipt\s*(no\.?|number|#)/i],
  invoice_date: [/invoice\s*date/i, /date\s*of\s*issue/i],
  due_date: [/due\s*date/i, /payment\s*due/i],
  subtotal: [/sub[\s-]*total/i],
  tax_amount: [/\bvat\b/i, /\btax\b/i, /\bgst\b/i],
  total_amount: [/\bgrand\s*total\b/i, /\btotal\s*due\b/i, /(?<!sub)(?<!sub )\btotal\b/i],
  payment_method: [/payment\s*method/i, /paid\s*via/i, /paid\s*by/i],
  currency: [/\bcurrency\b/i],
};

const AMOUNT_RE = /([€£$₹৳]|[A-Z]{3})?\s?([0-9][0-9,]*\.?[0-9]{0,2})/;
const DATE_RE = /(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/;
const LABEL_VALUE_RE = /[:\-]\s*(.+)$/;
const CURRENCY_SYMBOLS: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR', '৳': 'BDT' };
const CURRENCY_CODE_RE = /\b(USD|EUR|GBP|INR|BDT)\b/i;

const AMOUNT_KEYS = new Set(['subtotal', 'tax_amount', 'total_amount']);
const DATE_KEYS = new Set(['invoice_date', 'due_date']);

function extractValueFor(key: string, text: string): string | null {
  if (AMOUNT_KEYS.has(key)) {
    const match = AMOUNT_RE.exec(text);
    return match ? match[2].replace(/,/g, '') : null;
  }
  if (DATE_KEYS.has(key)) {
    const match = DATE_RE.exec(text);
    return match ? match[1] : null;
  }
  if (key === 'currency') {
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (text.includes(symbol)) return code;
    }
    const match = CURRENCY_CODE_RE.exec(text);
    return match ? match[1].toUpperCase() : null;
  }
  const match = LABEL_VALUE_RE.exec(text);
  return match ? match[1].trim() : null;
}

export type ExtractedField = { value: string; confidence: number };

export function extractFields(lines: OcrLine[]): Record<string, ExtractedField> {
  const results: Record<string, ExtractedField> = {};

  for (const [key, patterns] of Object.entries(LABEL_PATTERNS)) {
    for (const line of lines) {
      const text = line.text || '';
      if (!text) continue;
      if (patterns.some((pattern) => pattern.test(text))) {
        const value = extractValueFor(key, text);
        if (value) {
          results[key] = { value, confidence: line.confidence };
          break;
        }
      }
    }
  }

  if (!results.vendor_name) {
    const allPatterns = Object.values(LABEL_PATTERNS).flat();
    for (const line of lines) {
      const text = (line.text || '').trim();
      if (text.length < 3 || !/[A-Za-z]{3,}/.test(text)) continue;
      if (allPatterns.some((pattern) => pattern.test(text))) continue;
      results.vendor_name = { value: text, confidence: line.confidence };
      break;
    }
  }

  return results;
}

export function buildFieldValue(
  key: string,
  extracted: Record<string, ExtractedField>,
  threshold: number,
): FieldValue {
  const match = extracted[key];
  if (match && match.confidence >= threshold) {
    return { value: match.value, origin: 'auto' as FieldOrigin, confidence: match.confidence };
  }
  return { value: '', origin: 'empty' as FieldOrigin, confidence: null };
}

import { FieldOrigin, FieldValue, OcrLine } from './invoiceTypes';

// Mirrors backend/invoices/mobile_money_field_mapping.py
const LABEL_PATTERNS: Record<string, RegExp[]> = {
  transaction_id: [
    /trx[\s.:_-]*[il1|]d/i,
    /transact[a-z]*[\s.:_-]*[il1|]d/i,
    /ট্রানজেকশন\s*আই[ডদভ]ি/,
    /\b1110\b/,
  ],
  phone_number: [/একাউন্ট/, /\baccount\b/i],
  transaction_datetime: [/\btime\b/i, /সম[য়য়]/],
  amount: [/\bamount\b/i, /পরিমাণ/],
  charge: [/\bcharge\b/i, /চার্জ/],
  total_amount: [/\btotal\b/i],
  reference_name: [/\breference\b/i, /রেফারেন্স/],
};

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

const TRANSACTION_ID_STRICT_RE = /\b(?=[A-Za-z0-9]{6,14}\b)(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]+\b/;
const TRANSACTION_ID_LOOSE_RE = /\b[A-Za-z][A-Za-z0-9]{5,13}\b/;
const PHONE_RE = /01[3-9]\d(?:[-\s]?\d){7}/;
const DATETIME_LONG_RE = /\d{1,2}\s+[A-Za-z]+\s+\d{4},?\s*\d{1,2}:\d{2}\s*[APap][Mm]/;
const DATETIME_COMPACT_RE = /\d{1,2}:\d{2}\s*[APap][Mm]\s+\d{1,2}\/\d{1,2}\/\d{2,4}/;
const DATETIME_COMPACT_DATE_FIRST_RE = /\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*[APap][Mm]/;
const CURRENCY_VALUE_RE = /(?:[-−]\s*)?(?:৳|%|Tk\.?|টাকা)?\s*([0-9][0-9,]*\.?[0-9]{0,2})\s*(?:৳|%|Tk\.?|টাকা)?/g;
const NO_CHARGE_RE = /no\s*charge/i;
const COPY_ICON_JUNK_RE = /\[[A-Za-z0-9]{0,3}\]?/g;
const NAME_TOKEN_RE = /[A-Za-z][A-Za-z .]{1,29}/g;

const FIELD_MIN_CONFIDENCE = 80;

const TRANSACTION_ID_BLOCKLIST = new Set([
  'transaction', 'reference', 'successful', 'balance', 'amount', 'charge',
  'total', 'sendmoney', 'bkash', 'nagad', 'rocket', 'enable', 'share',
]);

const NOISE_SUBSTRINGS = [
  'send money', 'successful', 'call', 'message', 'share', 'back to home',
  'enable auto pay', 'auto pay', 'reward points', 'new balance', 'you have',
  'you have earned', 'bkash', 'nagad', 'rocket', 'to use your points', 'check your',
  'সেন্ড মানি', 'স্যান্ড মানি', 'বন্ধ', 'শেয়ার', 'একাউন্ট', 'সময়', 'সময়', 'পরিমাণ', 'চার্জ',
  'ট্রানজেকশন', 'রেফারেন্স', 'ইনবক্স', 'নোটিফিকেশন', 'ফিল্টার', 'লেনদেন',
];
const NAME_CANDIDATE_RE = /^[A-Za-z][A-Za-z .]{2,29}$/;

const ALL_LABEL_PATTERNS = Object.values(LABEL_PATTERNS).flat();

function normalizeDigits(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)));
}

function normalizeDatetime(raw: string): string {
  const text = raw.trim();
  const timeFirst = /^(\d{1,2}:\d{2}\s*[APap][Mm])\s+(\d{1,2}\/\d{1,2}\/\d{2,4})$/.exec(text);
  if (timeFirst) return `${timeFirst[2]} ${timeFirst[1]}`;
  return text;
}

function extractDatetime(text: string): string | null {
  const longMatch = DATETIME_LONG_RE.exec(text);
  if (longMatch) return longMatch[0].trim();
  const compactMatch = DATETIME_COMPACT_RE.exec(text) || DATETIME_COMPACT_DATE_FIRST_RE.exec(text);
  return compactMatch ? normalizeDatetime(compactMatch[0]) : null;
}

function normalizeCurrencyAmount(value: string): string {
  if (/^[68]\d{3}\.\d{2}$/.test(value)) {
    const stripped = value.slice(1);
    const whole = Number(stripped.split('.')[0]);
    if (whole >= 1 && whole <= 999) return stripped;
  }
  return value;
}

function extractCurrencyValues(text: string): string[] {
  const values: string[] = [];
  CURRENCY_VALUE_RE.lastIndex = 0;
  let match = CURRENCY_VALUE_RE.exec(text);
  while (match) {
    values.push(normalizeCurrencyAmount(match[1].replace(/,/g, '')));
    match = CURRENCY_VALUE_RE.exec(text);
  }
  return values;
}

function cleanReferenceCandidate(text: string): string {
  let parts = text.trim().split(/\s+/).filter(Boolean);
  while (parts.length && parts[0].length <= 2) parts = parts.slice(1);
  while (parts.length && parts[parts.length - 1].length <= 2) parts = parts.slice(0, -1);
  return parts.join(' ').trim();
}

function isNameCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (!NAME_CANDIDATE_RE.test(trimmed) || trimmed.length < 3) return false;
  if (/^[A-Z]{1,3}$/.test(trimmed)) return false;
  // All-caps tokens of trx-id length are IDs, not person names.
  if (/^[A-Z]{6,14}$/.test(trimmed)) return false;
  const lowered = trimmed.toLowerCase();
  if (NOISE_SUBSTRINGS.some((noise) => lowered.includes(noise))) return false;
  if (ALL_LABEL_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  return true;
}

function extractReferenceName(rawText: string): string | null {
  let remainder = normalizeDigits(rawText);
  for (const pattern of ALL_LABEL_PATTERNS) {
    remainder = remainder.replace(pattern, '');
  }
  // Only strip strict (digit-containing) trx IDs — loose matching would
  // delete real names like "Nafisha".
  remainder = remainder.replace(TRANSACTION_ID_STRICT_RE, '');
  remainder = remainder.replace(PHONE_RE, '');
  remainder = remainder.replace(DATETIME_LONG_RE, '');
  remainder = remainder.replace(DATETIME_COMPACT_RE, '');
  remainder = remainder.replace(DATETIME_COMPACT_DATE_FIRST_RE, '');
  CURRENCY_VALUE_RE.lastIndex = 0;
  remainder = remainder.replace(CURRENCY_VALUE_RE, '');
  remainder = remainder.replace(COPY_ICON_JUNK_RE, '');
  remainder = remainder.replace(/^[\s:–\-_|]+|[\s:–\-_|]+$/g, '').trim();
  remainder = cleanReferenceCandidate(remainder);
  if (isNameCandidate(remainder)) return remainder;

  const tokens = remainder.match(NAME_TOKEN_RE) || [];
  for (const token of tokens) {
    const trimmed = cleanReferenceCandidate(token);
    if (isNameCandidate(trimmed)) return trimmed;
  }
  return null;
}

function isPlausibleTransactionId(value: string): boolean {
  if (!value || value.length < 6 || value.length > 14 || !/^[A-Za-z0-9]+$/.test(value)) return false;
  if (TRANSACTION_ID_BLOCKLIST.has(value.toLowerCase())) return false;
  if (/[0-9]/.test(value)) return true;
  return /^[A-Z]+$/.test(value);
}

function normalizeTransactionId(value: string): string {
  return value.replace(/[>|]+$/g, '').trim().replace(/I([A-Z])$/, '1$1');
}

function stripKnownLabels(text: string): string {
  let cleaned = text;
  for (const pattern of ALL_LABEL_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned;
}

function extractTransactionId(text: string, loose = false): string | null {
  const normalized = normalizeDigits(text);
  const strict = TRANSACTION_ID_STRICT_RE.exec(normalized);
  if (strict && isPlausibleTransactionId(strict[0])) return normalizeTransactionId(strict[0]);
  if (loose) {
    const looseRe = new RegExp(TRANSACTION_ID_LOOSE_RE.source, 'g');
    let match = looseRe.exec(normalized);
    while (match) {
      const candidate = normalizeTransactionId(match[0]);
      if (isPlausibleTransactionId(candidate)) return candidate;
      match = looseRe.exec(normalized);
    }
  }
  return null;
}

function extractValueFor(key: string, rawText: string, labeled = false): string | null {
  const text = normalizeDigits(rawText);
  if (key === 'transaction_id') return extractTransactionId(stripKnownLabels(text), labeled);
  if (key === 'phone_number') {
    const match = PHONE_RE.exec(text);
    return match ? match[0].replace(/\D/g, '') : null;
  }
  if (key === 'transaction_datetime') return extractDatetime(text);
  if (key === 'amount' || key === 'charge' || key === 'total_amount') {
    if (key === 'charge' && NO_CHARGE_RE.test(text)) return '0';
    const values = extractCurrencyValues(text);
    if (!values.length) return null;
    if (key === 'total_amount') return values.reduce((best, value) => (Number(value) > Number(best) ? value : best));
    if (key === 'amount') return values[0];
    return values.length > 1 ? values[1] : values[0];
  }
  if (key === 'reference_name') return extractReferenceName(rawText);
  return null;
}

function withBoostedConfidence(confidence: number): number {
  return Math.max(confidence || 0, FIELD_MIN_CONFIDENCE);
}

function scoreTransactionId(value: string): [number, number] {
  if (!value) return [0, 0];
  return [/[0-9]/.test(value) ? 2 : 1, value.length];
}

export type ExtractedField = { value: string; confidence: number };

export function mergeExtractedFields(
  ...results: Array<Record<string, ExtractedField>>
): Record<string, ExtractedField> {
  const merged: Record<string, ExtractedField> = {};
  for (const result of results) {
    for (const [key, item] of Object.entries(result || {})) {
      const existing = merged[key];
      if (!existing) {
        merged[key] = item;
        continue;
      }
      if (key === 'transaction_id') {
        const nextScore = scoreTransactionId(item.value);
        const prevScore = scoreTransactionId(existing.value);
        if (nextScore[0] > prevScore[0] || (nextScore[0] === prevScore[0] && nextScore[1] > prevScore[1])) {
          merged[key] = item;
        } else if (
          nextScore[0] === prevScore[0]
          && nextScore[1] === prevScore[1]
          && item.confidence > existing.confidence
        ) {
          merged[key] = item;
        }
      } else if (item.confidence > existing.confidence) {
        merged[key] = item;
      }
    }
  }
  return merged;
}

export function extractFields(lines: OcrLine[]): Record<string, ExtractedField> {
  const results: Record<string, ExtractedField> = {};

  for (const [key, patterns] of Object.entries(LABEL_PATTERNS)) {
    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i].text || '';
      if (!text) continue;
      if (patterns.some((pattern) => pattern.test(text))) {
        let value = extractValueFor(key, text, true);
        let confidence = lines[i].confidence;
        if (!value && i + 1 < lines.length) {
          const nextText = lines[i + 1].text || '';
          if (nextText) {
            const nextValue = extractValueFor(key, nextText, true);
            if (nextValue) {
              value = nextValue;
              confidence = Math.max(lines[i].confidence, lines[i + 1].confidence);
            }
          }
        }
        if (value) {
          results[key] = { value, confidence: withBoostedConfidence(confidence) };
          break;
        }
      }
    }
  }

  if (!results.transaction_id) {
    for (const line of lines) {
      const value = extractTransactionId(line.text || '', false);
      if (value) {
        results.transaction_id = { value, confidence: withBoostedConfidence(line.confidence) };
        break;
      }
    }
  }

  if (!results.phone_number) {
    for (const line of lines) {
      const match = PHONE_RE.exec(normalizeDigits(line.text || ''));
      if (match) {
        results.phone_number = {
          value: match[0].replace(/\D/g, ''),
          confidence: withBoostedConfidence(line.confidence),
        };
        break;
      }
    }
  }

  if (!results.transaction_datetime) {
    for (const line of lines) {
      const value = extractDatetime(normalizeDigits(line.text || ''));
      if (value) {
        results.transaction_datetime = { value, confidence: withBoostedConfidence(line.confidence) };
        break;
      }
    }
  }

  if (!results.amount && !results.charge && !results.total_amount) {
    for (const line of lines) {
      const text = normalizeDigits(line.text || '');
      if (PHONE_RE.test(text) || DATETIME_LONG_RE.test(text) || DATETIME_COMPACT_RE.test(text) || DATETIME_COMPACT_DATE_FIRST_RE.test(text)) continue;
      if (TRANSACTION_ID_STRICT_RE.test(text)) continue;
      const values = extractCurrencyValues(text);
      if (values.length) {
        results.amount = { value: values[0], confidence: withBoostedConfidence(line.confidence) };
        break;
      }
    }
  }

  if (!results.reference_name) {
    for (const line of lines) {
      const text = line.text || '';
      if (!TRANSACTION_ID_STRICT_RE.test(normalizeDigits(text)) && !TRANSACTION_ID_LOOSE_RE.test(text)) continue;
      const name = extractReferenceName(text);
      if (name) {
        results.reference_name = { value: name, confidence: withBoostedConfidence(line.confidence) };
        break;
      }
    }
  }

  if (!results.reference_name) {
    for (const line of lines) {
      const text = (line.text || '').trim();
      if (isNameCandidate(text)) {
        results.reference_name = { value: text, confidence: withBoostedConfidence(line.confidence) };
        break;
      }
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

export const MOBILE_MONEY_FIELD_TEMPLATE = [
  { key: 'transaction_id', label: 'Transaction ID', type: 'text' as const },
  { key: 'phone_number', label: 'Phone Number', type: 'text' as const },
  { key: 'transaction_datetime', label: 'Date & Time', type: 'text' as const },
  { key: 'amount', label: 'Amount', type: 'currency' as const },
  { key: 'charge', label: 'Charge / Fee', type: 'currency' as const },
  { key: 'total_amount', label: 'Total', type: 'currency' as const },
  { key: 'reference_name', label: 'Recipient / Reference', type: 'text' as const },
];

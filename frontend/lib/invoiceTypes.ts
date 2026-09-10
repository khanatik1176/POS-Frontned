export type FieldType = 'text' | 'date' | 'currency';

export type FieldTemplateItem = {
  key: string;
  label: string;
  type: FieldType;
};

export type FieldOrigin =
  | 'auto'
  | 'manual'
  | 'empty'
  | 'server-pending'
  | 'server-filled'
  | 'server-unresolved';

export type FieldValue = {
  value: string;
  origin: FieldOrigin;
  confidence: number | null;
};

export type LineItemOrigin = 'auto' | 'manual' | 'empty';

export type LineItem = {
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  origin: LineItemOrigin;
};

export type LocalReadStatus = 'ok' | 'unreadable';
export type ServerImageStatus = 'not_needed' | 'pending' | 'processed' | 'failed';

export type InvoiceImageSummary = {
  id: number;
  local_read_status: LocalReadStatus;
  server_status: ServerImageStatus;
  created_at: string;
};

export type InvoiceImageDetail = InvoiceImageSummary & {
  server_ocr_text: string;
  data_uri: string;
};

export type InvoiceRecord = {
  id: number;
  created_at: string;
  updated_at: string;
  fields: Record<string, FieldValue>;
  line_items: LineItem[];
  has_pending_server_review: boolean;
  notified: boolean;
  images: InvoiceImageSummary[];
};

export type InvoiceImageUpload = {
  image_data: string;
  content_type: string;
  local_read_status: LocalReadStatus;
};

export type CreateInvoiceRecordPayload = {
  fields: Record<string, FieldValue>;
  line_items: LineItem[];
  images: InvoiceImageUpload[];
};

export type OcrLine = {
  text: string;
  confidence: number;
};

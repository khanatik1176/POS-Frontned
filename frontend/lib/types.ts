export type Product = {
  id: number;
  name: string;
  packages: { id: number; name: string }[];
};

export type LookupDetail = {
  id: number;
  code: string;
  name: string;
};

export type OrderItem = {
  id: number;
  product: number;
  product_name: string;
  package_type: number;
  package_type_name: string;
  quantity: number;
};

export type Order = {
  id: number;
  customer_name: string;
  url: string;
  platform_type: string | number;
  platform_type_detail?: LookupDetail;
  product?: number;
  product_name?: string;
  package_type?: number;
  package_type_name?: string;
  quantity?: number;
  payment_method: string | number;
  payment_method_detail?: LookupDetail;
  payment_medium: string | number;
  payment_medium_detail?: LookupDetail;
  reference_number: number | string;
  reference_number_value?: string;
  status: 'ordered' | 'verified' | 'completed' | number;
  status_detail?: LookupDetail;
  entry_time: string;
  customer_status: 'new' | 'renewal' | number;
  customer_status_detail?: LookupDetail;
  previous_reference: number | null;
  previous_reference_value?: string | null;
  delivered_reference: number | null;
  delivered_reference_value?: string | null;
  items?: OrderItem[];
};

export type ReferenceOption = {
  id: number;
  value: string;
};

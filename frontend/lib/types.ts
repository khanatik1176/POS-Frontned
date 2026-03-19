export type Product = {
  id: number;
  name: string;
  packages: { id: number; name: string }[];
};

export type Order = {
  id: number;
  customer_name: string;
  url: string;
  platform_type: string;
  product: number;
  product_name: string;
  package_type: number;
  package_type_name: string;
  quantity: number;
  payment_method: string;
  payment_medium: string;
  reference_number: number;
  reference_number_value: string;
  status: 'ordered' | 'verified' | 'completed';
  entry_time: string;
  customer_status: 'new' | 'renewal';
  previous_reference: number | null;
  previous_reference_value?: string | null;
  delivered_reference: number | null;
  delivered_reference_value?: string | null;
};

export type ReferenceOption = {
  id: number;
  value: string;
};

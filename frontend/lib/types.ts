export type MasterItem = {
  id: number;
  name: string;
  code?: string | null;
};

export type StatusItem = MasterItem & {
  color_code?: string | null;
};

export type PackageType = {
  id: number;
  name: string;
  code?: string | null;
  product: number;
};

export type Product = {
  id: number;
  name: string;
  code?: string | null;
  package_types: PackageType[];
};

export type ReferenceItem = {
  id: number;
  value: string;
};

export type MasterDataResponse = {
  platform_types: MasterItem[];
  payment_methods: MasterItem[];
  payment_mediums: MasterItem[];
  statuses: StatusItem[];
  customer_statuses: MasterItem[];
  products: Product[];
};

export type OrderItemForm = {
  product_id: number | "";
  package_type_id: number | "";
  quantity: number;
};

export type CreateOrderPayload = {
  customer_name: string;
  url: string;
  platform_type_id?: number;
  payment_method_id?: number;
  payment_medium_id?: number;
  status_id?: number;
  customer_status_id?: number;
  quantity: number;
  reference_number: string;
  previous_reference?: string;
  items: {
    product_id: number;
    package_type_id: number;
    quantity: number;
  }[];
};

export type OrderItemRead = {
  id: number;
  product: Product;
  package_type: PackageType;
  quantity: number;
};

export type OrderListItem = {
  id: number;
  customer_name: string;
  url: string;
  platform_type_master?: MasterItem;
  payment_method_master?: MasterItem;
  payment_medium_master?: MasterItem;
  status_master?: StatusItem;
  customer_status_master?: MasterItem;
  quantity: number;
  reference_number?: ReferenceItem | null;
  previous_reference?: ReferenceItem | null;
  verified_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  items: OrderItemRead[];
};
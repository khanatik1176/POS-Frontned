import { CircleHelp, Facebook, Globe, Instagram, Music2, Youtube } from 'lucide-react';
import { API_URL } from './api';
import { Order, Product } from './types';

export const statusClass: Record<string, string> = {
  ordered: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
  verified: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50',
  declined: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50',
};

// Solid fills for chart bars/segments - same hue family as statusClass above,
// kept as a separate map since chart marks need a solid fill rather than the
// soft badge background.
export const statusBarColor: Record<string, string> = {
  ordered: 'bg-amber-400',
  verified: 'bg-sky-400',
  completed: 'bg-emerald-400',
  declined: 'bg-rose-400',
};

export const getPlatformIcon = (platformCode: string) => {
  const key = platformCode.toLowerCase();

  if (['facebook', 'fb', 'meta'].includes(key)) return Facebook;
  if (['instagram', 'ig'].includes(key)) return Instagram;
  if (['youtube', 'yt'].includes(key)) return Youtube;
  if (['website', 'web', 'site', 'blog', 'landing-page'].includes(key)) return Globe;
  if (['tiktok', 'tik-tok'].includes(key)) return Music2;

  return CircleHelp;
};

export const customerStatusClass: Record<string, string> = {
  new: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  renewal: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};

export const actionClass = {
  verify: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm hover:shadow-md hover:from-amber-500 hover:to-orange-600 border-none ring-1 ring-amber-500/20 dark:ring-amber-400/20',
  deliver: 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-sm hover:shadow-md hover:from-sky-500 hover:to-indigo-600 border-none ring-1 ring-sky-500/20 dark:ring-sky-400/20',
  done: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
  declined: 'bg-neutral-50 text-neutral-500 border-neutral-200/60 dark:bg-neutral-800/50 dark:text-neutral-400 dark:border-neutral-700/50',
};

const statusCodeMap: Record<number, 'ordered' | 'verified' | 'completed' | 'declined'> = {
  1: 'ordered',
  2: 'verified',
  3: 'completed',
  4: 'declined',
};

const customerStatusCodeMap: Record<number, 'new' | 'renewal'> = {
  1: 'new',
  2: 'renewal',
};

export const statusRequestMap: Record<string, string> = {
  ordered: '1',
  verified: '2',
  completed: '3',
  declined: '4',
};

export const customerStatusRequestMap: Record<string, string> = {
  new: '1',
  renewal: '2',
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const normalizeStatusCode = (value: unknown): 'ordered' | 'verified' | 'completed' | 'declined' => {
  if (typeof value === 'number') return statusCodeMap[value] || 'ordered';
  if (typeof value !== 'string') return 'ordered';

  const normalized = value.trim().toLowerCase();
  if (normalized in statusClass) return normalized as 'ordered' | 'verified' | 'completed' | 'declined';

  const numericCode = Number(normalized);
  if (!Number.isNaN(numericCode) && statusCodeMap[numericCode]) {
    return statusCodeMap[numericCode];
  }

  return 'ordered';
};

const normalizeCustomerStatusCode = (value: unknown): 'new' | 'renewal' => {
  if (typeof value === 'number') return customerStatusCodeMap[value] || 'new';
  if (typeof value !== 'string') return 'new';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'new' || normalized === 'renewal') return normalized;

  const numericCode = Number(normalized);
  if (!Number.isNaN(numericCode) && customerStatusCodeMap[numericCode]) {
    return customerStatusCodeMap[numericCode];
  }

  return 'new';
};

export const getStatusCode = (order: Order) => {
  if (order.status_detail?.code) return normalizeStatusCode(order.status_detail.code);
  if (order.status_detail?.name) return normalizeStatusCode(order.status_detail.name);
  return normalizeStatusCode(order.status);
};

export const getStatusLabel = (order: Order) => {
  if (order.status_detail?.name) return order.status_detail.name;
  return toTitleCase(getStatusCode(order));
};

export const getCustomerStatusCode = (order: Order) => {
  if (order.customer_status_detail?.code) return normalizeCustomerStatusCode(order.customer_status_detail.code);
  if (order.customer_status_detail?.name) return normalizeCustomerStatusCode(order.customer_status_detail.name);
  return normalizeCustomerStatusCode(order.customer_status);
};

export const getCustomerStatusLabel = (order: Order) => {
  if (order.customer_status_detail?.name) return order.customer_status_detail.name;
  return toTitleCase(getCustomerStatusCode(order));
};

export const getPlatformLabel = (order: Order) => {
  if (order.platform_type_detail?.name) return order.platform_type_detail.name;
  if (typeof order.platform_type === 'string') return order.platform_type;
  return String(order.platform_type ?? '');
};

export const getPlatformCode = (order: Order) => {
  if (order.platform_type_detail?.code) return order.platform_type_detail.code.toLowerCase();
  if (typeof order.platform_type === 'string') return order.platform_type.toLowerCase();
  return '';
};

export const getPaymentMethodLabel = (order: Order) => {
  if (order.payment_method_detail?.name) return order.payment_method_detail.name;
  if (typeof order.payment_method === 'string') return order.payment_method;
  return String(order.payment_method ?? '');
};

export const getPaymentMediumLabel = (order: Order) => {
  if (order.payment_medium_detail?.name) return order.payment_medium_detail.name;
  if (typeof order.payment_medium === 'string') return order.payment_medium;
  return String(order.payment_medium ?? '');
};

export const getPrimaryReference = (order: Order) => {
  if (order.reference_number_value) return order.reference_number_value;
  if (typeof order.reference_number === 'string') return order.reference_number;
  return String(order.reference_number ?? '');
};

export const getOrderItemsSummary = (order: Order) => {
  const items = order.items || [];
  if (items.length === 0) {
    return {
      productNames: order.product_name ? [order.product_name] : [],
      packageNames: order.package_type_name ? [order.package_type_name] : [],
      quantity: order.quantity || 0,
    };
  }

  return {
    productNames: items.map((item) => item.product_name).filter(Boolean),
    packageNames: items.map((item) => item.package_type_name).filter(Boolean),
    quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
  };
};

export const getProductsWithPackages = (order: Order) => {
  const items = order.items || [];
  if (items.length === 0) {
    return order.product_name
      ? [{
          productName: order.product_name,
          packageNames: order.package_type_name ? [order.package_type_name] : [],
          quantity: order.quantity || 0,
        }]
      : [];
  }

  const grouped = new Map<number, { productName: string; packages: Set<string>; totalQty: number }>();
  items.forEach((item) => {
    if (!grouped.has(item.product)) {
      grouped.set(item.product, {
        productName: item.product_name,
        packages: new Set(),
        totalQty: 0,
      });
    }
    const group = grouped.get(item.product)!;
    group.packages.add(item.package_type_name);
    group.totalQty += item.quantity || 0;
  });

  return Array.from(grouped.values()).map((group) => ({
    productName: group.productName,
    packageNames: Array.from(group.packages),
    quantity: group.totalQty,
  }));
};

export const formatEntryTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const year = date.getFullYear();

  const rawHours = date.getHours();
  const hours12 = rawHours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = rawHours >= 12 ? 'PM' : 'AM';

  return `${day} ${month} ${year}. ${hours12}.${minutes}${meridiem}`;
};

export const sortByEntryTime = (list: Order[], ordering: string) => {
  const sorted = [...list].sort((a, b) => {
    const aTime = new Date(a.entry_time).getTime();
    const bTime = new Date(b.entry_time).getTime();
    return bTime - aTime;
  });

  if (ordering === 'entry_time') {
    return sorted.reverse();
  }

  return sorted;
};

export const extractArrayFromPayload = <T,>(payload: T[] | Record<string, unknown>, preferredKeys: string[] = []) => {
  if (Array.isArray(payload)) return payload;

  const keyOrder = [...preferredKeys, 'results', 'data', 'items'];
  for (const key of keyOrder) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

export const normalizeProductsPayload = (payload: Product[] | Record<string, unknown>): Product[] => {
  const rawProducts = extractArrayFromPayload(payload, ['products']);

  return rawProducts
    .map((entry) => {
      const product = entry as Record<string, unknown>;
      const idValue = product.id ?? product.value;
      const nameValue = product.name ?? product.product_name ?? product.title ?? product.label;
      if (idValue === undefined || nameValue === undefined || nameValue === null) {
        return null;
      }

      const rawPackagesSource = product.packages
        ?? product.package_types
        ?? product.packageTypes
        ?? product.package_type;
      const rawPackages = Array.isArray(rawPackagesSource) ? rawPackagesSource : [];

      const packages = rawPackages
        .map((item) => {
          const pack = item as Record<string, unknown>;
          const packIdValue = pack.id ?? pack.value;
          const packNameValue = pack.name ?? pack.package_name ?? pack.title ?? pack.label;
          if (packIdValue === undefined || packNameValue === undefined || packNameValue === null) {
            return null;
          }

          const id = Number(packIdValue);
          if (Number.isNaN(id)) return null;

          return {
            id,
            name: String(packNameValue),
          };
        })
        .filter((item): item is { id: number; name: string } => item !== null);

      const id = Number(idValue);
      if (Number.isNaN(id)) return null;

      return {
        id,
        name: String(nameValue),
        packages,
      };
    })
    .filter((item): item is Product => item !== null);
};

export type OrderFilters = {
  status: string;
  product: string;
  customer_status: string;
  ordering: string;
  search: string;
};

export const initialFilters: OrderFilters = {
  status: 'all',
  product: 'all',
  customer_status: 'all',
  ordering: '-entry_time',
  search: '',
};

export const applyClientFilters = (list: Order[], nextFilters: OrderFilters) => {
  const searchValue = nextFilters.search.trim().toLowerCase();

  const filtered = list.filter((order) => {
    const matchesStatus = nextFilters.status === 'all' || getStatusCode(order) === nextFilters.status;
    const matchesCustomerStatus = nextFilters.customer_status === 'all' || getCustomerStatusCode(order) === nextFilters.customer_status;

    const itemProductIds = (order.items || []).map((item) => String(item.product));
    const orderProductId = order.product ? String(order.product) : '';
    const matchesProduct = nextFilters.product === 'all'
      || orderProductId === nextFilters.product
      || itemProductIds.includes(nextFilters.product);

    const searchable = [
      order.customer_name,
      order.url,
      getPrimaryReference(order),
      getPlatformLabel(order),
      getPaymentMethodLabel(order),
      getPaymentMediumLabel(order),
      ...getOrderItemsSummary(order).productNames,
      ...getOrderItemsSummary(order).packageNames,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !searchValue || searchable.includes(searchValue);

    return matchesStatus && matchesCustomerStatus && matchesProduct && matchesSearch;
  });

  return sortByEntryTime(filtered, nextFilters.ordering);
};

export const getOrdersWsUrl = (token?: string) => {
  const configured = process.env.NEXT_PUBLIC_ORDERS_WS_URL;
  const apiRoot = API_URL.replace(/\/api\/?$/, '');
  const inferredWsBase = apiRoot.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
  const baseUrl = configured || `${inferredWsBase}/ws/orders/`;

  if (!token) return baseUrl;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
};

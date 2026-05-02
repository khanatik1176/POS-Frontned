'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import ThemeToggle from '../components/ThemeToggle';
import CreateOrderModal from '../components/CreateOrderModal';
import DeliverOrderModal from '../components/DeliverOrderModal';
import {
  CircleHelp,
  Facebook,
  Globe,
  Instagram,
  Link2,
  LogOut,
  Music2,
  Youtube,
  Loader,
} from 'lucide-react';

const statusClass: Record<string, string> = {
  ordered: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
  verified: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50',
  declined: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50',
};

const customerStatusClass: Record<string, string> = {
  new: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  renewal: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};

const actionClass = {
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

const statusRequestMap: Record<string, string> = {
  ordered: '1',
  verified: '2',
  completed: '3',
  declined: '4',
};

const customerStatusRequestMap: Record<string, string> = {
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

const getStatusCode = (order: Order) => {
  if (order.status_detail?.code) return normalizeStatusCode(order.status_detail.code);
  if (order.status_detail?.name) return normalizeStatusCode(order.status_detail.name);
  return normalizeStatusCode(order.status);
};

const getStatusLabel = (order: Order) => {
  if (order.status_detail?.name) return order.status_detail.name;
  return toTitleCase(getStatusCode(order));
};

const getCustomerStatusCode = (order: Order) => {
  if (order.customer_status_detail?.code) return normalizeCustomerStatusCode(order.customer_status_detail.code);
  if (order.customer_status_detail?.name) return normalizeCustomerStatusCode(order.customer_status_detail.name);
  return normalizeCustomerStatusCode(order.customer_status);
};

const getCustomerStatusLabel = (order: Order) => {
  if (order.customer_status_detail?.name) return order.customer_status_detail.name;
  return toTitleCase(getCustomerStatusCode(order));
};

const getPlatformLabel = (order: Order) => {
  if (order.platform_type_detail?.name) return order.platform_type_detail.name;
  if (typeof order.platform_type === 'string') return order.platform_type;
  return String(order.platform_type ?? '');
};

const getPlatformCode = (order: Order) => {
  if (order.platform_type_detail?.code) return order.platform_type_detail.code.toLowerCase();
  if (typeof order.platform_type === 'string') return order.platform_type.toLowerCase();
  return '';
};

const getPlatformIcon = (platformCode: string) => {
  const key = platformCode.toLowerCase();

  if (['facebook', 'fb', 'meta'].includes(key)) return Facebook;
  if (['instagram', 'ig'].includes(key)) return Instagram;
  if (['youtube', 'yt'].includes(key)) return Youtube;
  if (['website', 'web', 'site', 'blog', 'landing-page'].includes(key)) return Globe;
  if (['tiktok', 'tik-tok'].includes(key)) return Music2;

  return CircleHelp;
};

const getPaymentMethodLabel = (order: Order) => {
  if (order.payment_method_detail?.name) return order.payment_method_detail.name;
  if (typeof order.payment_method === 'string') return order.payment_method;
  return String(order.payment_method ?? '');
};

const getPaymentMediumLabel = (order: Order) => {
  if (order.payment_medium_detail?.name) return order.payment_medium_detail.name;
  if (typeof order.payment_medium === 'string') return order.payment_medium;
  return String(order.payment_medium ?? '');
};

const getPrimaryReference = (order: Order) => {
  if (order.reference_number_value) return order.reference_number_value;
  if (typeof order.reference_number === 'string') return order.reference_number;
  return String(order.reference_number ?? '');
};

const getOrderItemsSummary = (order: Order) => {
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

const getProductsWithPackages = (order: Order) => {
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

const formatEntryTime = (value: string) => {
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

const sortByEntryTime = (list: Order[], ordering: string) => {
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

const extractArrayFromPayload = <T,>(payload: T[] | Record<string, unknown>, preferredKeys: string[] = []) => {
  if (Array.isArray(payload)) return payload;

  const keyOrder = [...preferredKeys, 'results', 'data', 'items'];
  for (const key of keyOrder) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const normalizeProductsPayload = (payload: Product[] | Record<string, unknown>): Product[] => {
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

const applyClientFilters = (list: Order[], nextFilters: typeof initialFilters) => {
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

const initialFilters = {
  status: 'all',
  product: 'all',
  customer_status: 'all',
  ordering: '-entry_time',
  search: '',
};

const getOrdersWsUrl = (token?: string) => {
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

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [wsDisconnected, setWsDisconnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const latestFiltersRef = useRef(filters);

  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  const fetchOrders = useCallback(async (nextFilters: typeof initialFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.status !== 'all') params.set('status', statusRequestMap[nextFilters.status] || nextFilters.status);
    if (nextFilters.product !== 'all') params.set('product', nextFilters.product);
    if (nextFilters.customer_status !== 'all') params.set('customer_status', customerStatusRequestMap[nextFilters.customer_status] || nextFilters.customer_status);
    if (nextFilters.ordering) params.set('ordering', nextFilters.ordering);
    if (nextFilters.search) {
      params.set('search', nextFilters.search);
      params.set('q', nextFilters.search);
    }
    params.set('_ts', String(Date.now()));
    return apiFetch<{ results?: Order[] } | Order[]>(`/orders/?${params.toString()}`);
  }, []);

  const loadData = useCallback(async (activeFilters: typeof initialFilters) => {
    try {
      setLoading(true);
      const [productData, orderData] = await Promise.all([
        apiFetch<Product[] | { results?: Product[] } | Record<string, unknown>>('/products/'),
        fetchOrders(activeFilters),
      ]);
      const fetchedOrders = Array.isArray(orderData) ? orderData : (orderData.results ?? []);
      setProducts(normalizeProductsPayload(productData));
      setOrders(applyClientFilters(fetchedOrders, activeFilters));
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  const refreshOrders = useCallback(async (activeFilters: typeof initialFilters) => {
    const data = await fetchOrders(activeFilters);
    const fetchedOrders = Array.isArray(data) ? data : (data.results ?? []);
    setOrders(applyClientFilters(fetchedOrders, activeFilters));
  }, [fetchOrders]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (!token) {
      router.push('/');
      return;
    }
    loadData(initialFilters);
  }, [loadData, router]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!localStorage.getItem('accessToken') && !localStorage.getItem('token')) return;
      try {
        await refreshOrders(filters);
      } catch {
        // ignore transient fetch errors in UI
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [filters, refreshOrders]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isClosedByCleanup = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connect = () => {
      const wsUrl = getOrdersWsUrl(token);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        reconnectAttempts = 0;
        setWsDisconnected(false);
      };

      socket.onmessage = () => {
        void refreshOrders(latestFiltersRef.current);
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (isClosedByCleanup) return;
        reconnectAttempts += 1;
        if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
          setWsDisconnected(true);
          return;
        }
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      isClosedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [refreshOrders]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    const interval = setInterval(() => {
      void refreshOrders(latestFiltersRef.current);
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshOrders]);

  const verifyOrder = async (orderId: number) => {
    if (verifyingOrderId === orderId) return;

    setVerifyingOrderId(orderId);
    setActionError('');

    try {
      const verifyEndpoints = [`/orders/${orderId}/verify/`, `/orders/${orderId}/verify`];
      const verifyMethods: Array<'POST' | 'PATCH'> = ['POST', 'PATCH'];
      let updatedOrder: Order | null = null;
      let lastError: unknown;

      for (const endpoint of verifyEndpoints) {
        for (const method of verifyMethods) {
          try {
            updatedOrder = await apiFetch<Order>(endpoint, {
              method,
            });
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (updatedOrder) {
          break;
        }
      }

      if (!updatedOrder) {
        throw lastError instanceof Error ? lastError : new Error('Failed to verify order');
      }

      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      void refreshOrders(latestFiltersRef.current);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to verify order');
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    router.push('/');
  };

  const stats = useMemo(() => ({
    total: orders.length,
    ordered: orders.filter((o) => getStatusCode(o) === 'ordered').length,
    verified: orders.filter((o) => getStatusCode(o) === 'verified').length,
    completed: orders.filter((o) => getStatusCode(o) === 'completed').length,
  }), [orders]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(#d7d7d7_1px,transparent_1px),linear-gradient(90deg,#d7d7d7_1px,transparent_1px)] [background-size:40px_40px] dark:[background-image:linear-gradient(#2f2f2f_1px,transparent_1px),linear-gradient(90deg,#2f2f2f_1px,transparent_1px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] min-w-0 gap-4 px-3 py-4 sm:px-4 md:gap-5 md:px-5 md:py-6 xl:px-7">
        <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Create, verify, deliver, filter, and track orders.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <ThemeToggle />
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-3 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
              onClick={logout}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <LogOut size={16} />
                Logout
              </span>
            </button>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 sm:w-auto dark:border-white dark:bg-white dark:text-neutral-950" onClick={() => setShowCreateModal(true)}>Create Order</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Total</strong><div className="text-3xl font-extrabold tracking-tight">{stats.total}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Ordered</strong><div className="text-3xl font-extrabold tracking-tight">{stats.ordered}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Verified</strong><div className="text-3xl font-extrabold tracking-tight">{stats.verified}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Completed</strong><div className="text-3xl font-extrabold tracking-tight">{stats.completed}</div></div>
        </div>

        <div className="grid gap-3 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Filter by Status</label>
              <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">All</option>
                <option value="ordered">Unverified / Ordered</option>
                <option value="verified">Verified</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Filter by Product</label>
              <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })}>
                <option value="all">All</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">User Status</label>
              <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={filters.customer_status} onChange={(e) => setFilters({ ...filters, customer_status: e.target.value })}>
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="renewal">Renewal</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Sort by Entry Time</label>
              <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={filters.ordering} onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}>
                <option value="-entry_time">Newest First</option>
                <option value="entry_time">Oldest First</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Search by Customer Name or URL</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search customer name or URL" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5 dark:border-neutral-800/60 dark:bg-neutral-900/40">
          {wsDisconnected && <div className="mb-4 rounded-xl border border-amber-200/50 bg-amber-50/50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">Live socket disconnected. Auto-refresh is active every 15s.</div>}
          {actionError && <div className="mb-4 rounded-xl border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-300">{actionError}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-neutral-500 dark:text-neutral-400">Loading orders...</div>
          ) : (
            <>
              <div className="hidden min-w-0 lg:block">
                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-neutral-200/60 bg-white/80 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950/50">
                  <table className="w-full min-w-[1120px] text-sm xl:min-w-[1240px]">
                    <thead className="bg-neutral-50/80 backdrop-blur-sm dark:bg-neutral-900/50">
                      <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60">
                        {['Customer', 'Platform', 'Products & Packages', 'Qty', 'Payment', 'Primary Ref', 'Previous Ref', 'New Ref', 'Status', 'User', 'Time', 'Actions'].map((head) => (
                          <th key={head} className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="group border-b border-neutral-100/80 transition-colors last:border-b-0 hover:bg-neutral-50/80 dark:border-neutral-800/40 dark:hover:bg-neutral-900/40">
                          <td className="px-4 py-4 align-middle font-medium text-neutral-900 dark:text-white">{order.customer_name}</td>
                          <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const PlatformIcon = getPlatformIcon(getPlatformCode(order));
                              return (
                                <div className="group/icon relative inline-flex">
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200/60 bg-white text-neutral-700 shadow-sm transition hover:-translate-y-0.5 dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-300">
                                    <PlatformIcon size={14} />
                                  </span>
                                  <span className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-max -translate-x-1/2 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover/icon:visible group-hover/icon:opacity-100 dark:bg-white dark:text-neutral-900">
                                    {getPlatformLabel(order)}
                                  </span>
                                </div>
                              );
                            })()}

                            <a
                              href={order.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group/icon relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200/60 bg-white text-neutral-700 shadow-sm transition hover:-translate-y-0.5 dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-300"
                              aria-label="Open URL"
                            >
                              <Link2 size={14} />
                              <span className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 max-w-[280px] -translate-x-1/2 truncate rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover/icon:visible group-hover/icon:opacity-100 dark:bg-white dark:text-neutral-900">
                                {order.url}
                              </span>
                            </a>
                          </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="space-y-1.5">
                              {getProductsWithPackages(order).map((prod, idx) => (
                                <div key={idx} className="text-sm">
                                  <div className="font-semibold text-neutral-900 dark:text-white">{prod.productName}</div>
                                  {prod.packageNames.length > 0 && (
                                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                                      {prod.packageNames.map((pkg) => (
                                        <span key={pkg} className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
                                          {pkg}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle font-medium">{getOrderItemsSummary(order).quantity || '—'}</td>
                          <td className="px-4 py-4 align-middle">
                            <div className="font-medium text-neutral-900 dark:text-white">{getPaymentMethodLabel(order)}</div>
                            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{getPaymentMediumLabel(order)}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle font-mono text-xs">{getPrimaryReference(order)}</td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle font-mono text-xs text-neutral-500 dark:text-neutral-400">{order.previous_reference_value || '—'}</td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle font-mono text-xs text-neutral-500 dark:text-neutral-400">{order.delivered_reference || '—'}</td>
                          <td className="px-4 py-4 align-middle">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass[getStatusCode(order)]}`}>
                              {getStatusLabel(order)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${customerStatusClass[getCustomerStatusCode(order)] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                              {getCustomerStatusLabel(order)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle text-xs text-neutral-500 dark:text-neutral-400">{formatEntryTime(order.entry_time)}</td>
                          <td className="px-4 py-4 align-middle">
                            {getStatusCode(order) === 'ordered' && (
                              <button className={`inline-flex whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} title="Verify" disabled={verifyingOrderId === order.id}>
                                {verifyingOrderId === order.id ? <Loader size={14} className="animate-spin" /> : '✔'} Verify
                              </button>
                            )}
                            {getStatusCode(order) === 'verified' && (
                              <button className={`inline-flex whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${actionClass.deliver}`} onClick={() => setDeliveryOrder(order)} title="Deliver">
                                📦 Deliver
                              </button>
                            )}
                            {getStatusCode(order) === 'completed' && <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${actionClass.done}`}>Done</span>}
                            {getStatusCode(order) === 'declined' && <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${actionClass.declined}`}>Declined</span>}
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={12} className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No orders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
                {orders.map((order) => (
                  <div key={order.id} className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800/60 dark:bg-neutral-900/80">
                    <div>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-neutral-900 dark:text-white">{order.customer_name}</h4>
                          <div className="mt-1.5 flex items-center gap-2">
                            {(() => {
                              const PlatformIcon = getPlatformIcon(getPlatformCode(order));
                              return (
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title={getPlatformLabel(order)}>
                                  <PlatformIcon size={14} />
                                </span>
                              );
                            })()}
                            <a
                              href={order.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                              title={order.url}
                              aria-label="Open URL"
                            >
                              <Link2 size={14} />
                            </a>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${customerStatusClass[getCustomerStatusCode(order)] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                              {getCustomerStatusLabel(order)}
                            </span>
                          </div>
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass[getStatusCode(order)]}`}>
                          {getStatusLabel(order)}
                        </span>
                      </div>

                      <div className="mb-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800/50 dark:bg-neutral-950/30">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Products & Packages</span>
                        <div className="space-y-2">
                          {getProductsWithPackages(order).map((prod, idx) => (
                            <div key={idx} className="text-sm">
                              <div className="font-semibold text-neutral-900 dark:text-white">{prod.productName}</div>
                              {prod.packageNames.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {prod.packageNames.map((pkg) => (
                                    <span key={pkg} className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                      {pkg}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Quantity</span>
                          <span className="font-medium text-neutral-900 dark:text-white">{getOrderItemsSummary(order).quantity || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Payment</span>
                          <span className="font-medium text-neutral-900 dark:text-white">{getPaymentMethodLabel(order)}</span>
                          <span className="ml-1 text-[11px] text-neutral-500 dark:text-neutral-400">({getPaymentMediumLabel(order)})</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Primary Ref</span>
                          <span className="font-mono text-xs text-neutral-900 dark:text-white">{getPrimaryReference(order)}</span>
                        </div>
                        {(order.previous_reference_value || order.delivered_reference_value) && (
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Other Refs</span>
                            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                              {[order.previous_reference_value, order.delivered_reference_value].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800/80">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatEntryTime(order.entry_time)}</span>
                      </div>
                      
                      <div className="flex w-full flex-col gap-2">
                        {getStatusCode(order) === 'ordered' && (
                          <button className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} disabled={verifyingOrderId === order.id}>
                            {verifyingOrderId === order.id ? <Loader size={16} className="animate-spin" /> : '✔'} Verify Order
                          </button>
                        )}
                        {getStatusCode(order) === 'verified' && (
                          <button className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${actionClass.deliver}`} onClick={() => setDeliveryOrder(order)}>
                            📦 Deliver Order
                          </button>
                        )}
                        {getStatusCode(order) === 'completed' && <div className={`flex w-full justify-center rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest ${actionClass.done}`}>Completed</div>}
                        {getStatusCode(order) === 'declined' && <div className={`flex w-full justify-center rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest ${actionClass.declined}`}>Declined</div>}
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="col-span-full py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No orders found.</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateOrderModal
          products={products}
          onClose={() => setShowCreateModal(false)}
          onCreated={(order) => setOrders((prev) => [order, ...prev])}
        />
      )}

      {deliveryOrder && (
        <DeliverOrderModal
          order={deliveryOrder}
          onClose={() => setDeliveryOrder(null)}
          onDelivered={(updated) => setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)))}
        />
      )}
    </div>
  );
}

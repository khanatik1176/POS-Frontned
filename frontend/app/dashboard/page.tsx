'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
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
} from 'lucide-react';

const statusClass: Record<string, string> = {
  ordered: 'text-amber-700 dark:text-amber-300',
  verified: 'text-sky-700 dark:text-sky-300',
  completed: 'text-emerald-700 dark:text-emerald-300',
};

const customerStatusClass: Record<string, string> = {
  new: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  renewal: 'bg-aqua-100 text-aqua-700 dark:bg-aqua-900/40 dark:text-aqua-300',
};

const actionClass = {
  verify: 'border-amber-300 bg-amber-100/70 text-amber-800 hover:bg-amber-200/70 dark:border-amber-700 dark:bg-amber-900/35 dark:text-amber-300 dark:hover:bg-amber-900/50',
  deliver: 'border-sky-300 bg-sky-100/70 text-sky-800 hover:bg-sky-200/70 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-300 dark:hover:bg-sky-900/50',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusCodeMap: Record<number, 'ordered' | 'verified' | 'completed'> = {
  1: 'ordered',
  2: 'verified',
  3: 'completed',
};

const customerStatusCodeMap: Record<number, 'new' | 'renewal'> = {
  1: 'new',
  2: 'renewal',
};

const statusRequestMap: Record<string, string> = {
  ordered: '1',
  verified: '2',
  completed: '3',
};

const customerStatusRequestMap: Record<string, string> = {
  new: '1',
  renewal: '2',
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getStatusCode = (order: Order) => {
  if (order.status_detail?.code) return order.status_detail.code;
  if (typeof order.status === 'string') return order.status;
  if (typeof order.status === 'number') return statusCodeMap[order.status] || 'ordered';
  return 'ordered';
};

const getStatusLabel = (order: Order) => {
  if (order.status_detail?.name) return order.status_detail.name;
  return toTitleCase(getStatusCode(order));
};

const getCustomerStatusCode = (order: Order) => {
  if (order.customer_status_detail?.code) return order.customer_status_detail.code;
  if (typeof order.customer_status === 'string') return order.customer_status;
  if (typeof order.customer_status === 'number') return customerStatusCodeMap[order.customer_status] || 'new';
  return 'new';
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

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState(initialFilters);

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
    return apiFetch<{ results?: Order[] } | Order[]>(`/orders/?${params.toString()}`);
  }, []);

  const loadData = useCallback(async (activeFilters: typeof initialFilters) => {
    try {
      setLoading(true);
      const [productData, orderData] = await Promise.all([
        apiFetch<Product[] | { results?: Product[] }>('http://127.0.0.1:8000/api/products/'),
        fetchOrders(activeFilters),
      ]);
      const fetchedOrders = Array.isArray(orderData) ? orderData : (orderData.results ?? []);
      setProducts(Array.isArray(productData) ? productData : (productData.results ?? []));
      setOrders(applyClientFilters(fetchedOrders, activeFilters));
    } finally {
      setLoading(false);
    }
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
        const data = await fetchOrders(filters);
        const fetchedOrders = Array.isArray(data) ? data : (data.results ?? []);
        setOrders(applyClientFilters(fetchedOrders, filters));
      } catch {
        // ignore transient fetch errors in UI
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [fetchOrders, filters]);

  const verifyOrder = async (orderId: number) => {
    const updated = await apiFetch<Order>(`/orders/${orderId}/verify/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
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
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(#d7d7d7_1px,transparent_1px),linear-gradient(90deg,#d7d7d7_1px,transparent_1px)] [background-size:40px_40px] dark:[background-image:linear-gradient(#2f2f2f_1px,transparent_1px),linear-gradient(90deg,#2f2f2f_1px,transparent_1px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-[1320px] gap-4 px-3 py-4 sm:px-4 md:gap-5 md:px-6 md:py-6 xl:px-8">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Total</strong><div className="text-3xl font-extrabold tracking-tight">{stats.total}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Ordered</strong><div className="text-3xl font-extrabold tracking-tight">{stats.ordered}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Verified</strong><div className="text-3xl font-extrabold tracking-tight">{stats.verified}</div></div>
          <div className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]"><strong>Completed</strong><div className="text-3xl font-extrabold tracking-tight">{stats.completed}</div></div>
        </div>

        <div className="grid gap-3 rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
          {loading ? (
            <div className="py-2 text-sm text-neutral-500 dark:text-neutral-300">Loading orders...</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1100px] w-full border-collapse">
                  <thead>
                    <tr>
                      {['Customer', 'Platform', 'Product', 'Package', 'Qty', 'Payment', 'Primary Ref', 'Previous Ref', 'New Ref', 'Status', 'Customer Status', 'Entry Time', 'Actions'].map((head) => (
                        <th key={head} className="border-b border-neutral-300 px-3 py-3 text-left text-[11px] uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.customer_name}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const PlatformIcon = getPlatformIcon(getPlatformCode(order));
                              return (
                                <div className="group relative inline-flex">
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white/70 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white">
                                    <PlatformIcon size={16} />
                                  </span>
                                  <span className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-max -translate-x-1/2 rounded-md bg-neutral-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:visible group-hover:opacity-100 dark:bg-white dark:text-neutral-900">
                                    {getPlatformLabel(order)}
                                  </span>
                                </div>
                              );
                            })()}

                            <a
                              href={order.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white/70 text-neutral-900 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
                              aria-label="Open URL"
                            >
                              <Link2 size={16} />
                              <span className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 max-w-[280px] -translate-x-1/2 truncate rounded-md bg-neutral-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:visible group-hover:opacity-100 dark:bg-white dark:text-neutral-900">
                                {order.url}
                              </span>
                            </a>
                          </div>
                        </td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{getOrderItemsSummary(order).productNames.join(', ') || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{getOrderItemsSummary(order).packageNames.join(', ') || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{getOrderItemsSummary(order).quantity || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700"><div>{getPaymentMethodLabel(order)}</div><div className="text-xs text-neutral-500 dark:text-neutral-300">{getPaymentMediumLabel(order)}</div></td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{getPrimaryReference(order)}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.previous_reference_value || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.delivered_reference || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700"><span className={`inline-flex rounded-full border border-current px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClass[getStatusCode(order)]}`}>{getStatusLabel(order)}</span></td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${customerStatusClass[getCustomerStatusCode(order)] || 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}>
                            {getCustomerStatusLabel(order)}
                          </span>
                        </td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{formatEntryTime(order.entry_time)}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">
                          {getStatusCode(order) === 'ordered' && (
                            <button className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} title="Verify">✔ Verify</button>
                          )}
                          {getStatusCode(order) === 'verified' && (
                            <button className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 ${actionClass.deliver}`} onClick={() => setDeliveryOrder(order)} title="Delivered">📦 Deliver</button>
                          )}
                          {getStatusCode(order) === 'completed' && <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${actionClass.done}`}>Done</span>}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={13} className="border-b border-neutral-300 px-3 py-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-neutral-300 bg-white/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/80">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{order.customer_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {(() => {
                            const PlatformIcon = getPlatformIcon(getPlatformCode(order));
                            return (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white/70 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white" title={getPlatformLabel(order)}>
                                <PlatformIcon size={14} />
                              </span>
                            );
                          })()}
                          <a
                            href={order.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white/70 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
                            title={order.url}
                            aria-label="Open URL"
                          >
                            <Link2 size={14} />
                          </a>
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full border border-current px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass[getStatusCode(order)]}`}>{getStatusLabel(order)}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div><span className="text-neutral-500 dark:text-neutral-300">Platform:</span> {getPlatformLabel(order)}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Product:</span> {getOrderItemsSummary(order).productNames.join(', ') || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Package:</span> {getOrderItemsSummary(order).packageNames.join(', ') || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Qty:</span> {getOrderItemsSummary(order).quantity || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Payment:</span> {getPaymentMethodLabel(order)}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Medium:</span> {getPaymentMediumLabel(order)}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Primary Ref:</span> {getPrimaryReference(order)}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Prev Ref:</span> {order.previous_reference_value || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">New Ref:</span> {order.delivered_reference_value || '—'}</div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-300">Customer:</span>{' '}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${customerStatusClass[getCustomerStatusCode(order)] || 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}>
                          {getCustomerStatusLabel(order)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-300">{formatEntryTime(order.entry_time)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getStatusCode(order) === 'ordered' && (
                        <button className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} title="Verify">✔ Verify</button>
                      )}
                      {getStatusCode(order) === 'verified' && (
                        <button className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 ${actionClass.deliver}`} onClick={() => setDeliveryOrder(order)} title="Delivered">📦 Deliver</button>
                      )}
                      {getStatusCode(order) === 'completed' && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionClass.done}`}>Done</span>}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="text-sm text-neutral-500 dark:text-neutral-300">No orders found.</div>}
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import AppShell from '../components/AppShell';
import RequirePermission from '../components/RequirePermission';
import CreateOrderModal from '../components/CreateOrderModal';
import DeliverOrderModal from '../components/DeliverOrderModal';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import { usePagination } from '@/lib/usePagination';
import { usePermissions } from '@/lib/usePermissions';
import { exportToExcel } from '@/lib/exportExcel';
import { Link2, Loader, Plus, Search, Download } from 'lucide-react';
import {
  actionClass,
  applyClientFilters,
  customerStatusClass,
  customerStatusRequestMap,
  formatEntryTime,
  getCustomerStatusCode,
  getCustomerStatusLabel,
  getOrderItemsSummary,
  getOrdersWsUrl,
  getPaymentMediumLabel,
  getPaymentMethodLabel,
  getPlatformCode,
  getPlatformIcon,
  getPlatformLabel,
  getPrimaryReference,
  getProductsWithPackages,
  getStatusCode,
  getStatusLabel,
  initialFilters,
  normalizeProductsPayload,
  OrderFilters,
  statusClass,
  statusRequestMap,
} from '@/lib/orderHelpers';

export default function OrdersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [wsDisconnected, setWsDisconnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const latestFiltersRef = useRef(filters);

  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  const fetchOrders = useCallback(async (nextFilters: OrderFilters) => {
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

  const loadData = useCallback(async (activeFilters: OrderFilters) => {
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

  const refreshOrders = useCallback(async (activeFilters: OrderFilters) => {
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

  const { page, setPage, pageSize, setPageSize, totalPages, paged: pagedOrders } = usePagination(orders);

  const handleExportExcel = () => {
    exportToExcel(
      `orders-${new Date().toISOString().slice(0, 10)}`,
      'Orders',
      [
        { header: 'Customer', key: 'customer', width: 24 },
        { header: 'Platform', key: 'platform', width: 16 },
        { header: 'Products', key: 'products', width: 30 },
        { header: 'Qty', key: 'qty', width: 8 },
        { header: 'Payment Method', key: 'paymentMethod', width: 18 },
        { header: 'Payment Medium', key: 'paymentMedium', width: 18 },
        { header: 'Primary Ref', key: 'primaryRef', width: 16 },
        { header: 'Previous Ref', key: 'previousRef', width: 16 },
        { header: 'New Ref', key: 'newRef', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'User Status', key: 'customerStatus', width: 14 },
        { header: 'Entry Time', key: 'entryTime', width: 20 },
      ],
      orders.map((order) => ({
        customer: order.customer_name,
        platform: getPlatformLabel(order),
        products: getProductsWithPackages(order).map((p) => `${p.productName} (${p.packageNames.join(', ')})`).join('; '),
        qty: getOrderItemsSummary(order).quantity || 0,
        paymentMethod: getPaymentMethodLabel(order),
        paymentMedium: getPaymentMediumLabel(order),
        primaryRef: getPrimaryReference(order),
        previousRef: order.previous_reference_value || '',
        newRef: order.delivered_reference || '',
        status: getStatusLabel(order),
        customerStatus: getCustomerStatusLabel(order),
        entryTime: formatEntryTime(order.entry_time),
      })),
    );
  };

  const headerActions = useMemo(() => (
    <>
      {can('orders.export') && (
        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-2 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
        >
          <Download size={16} />
          Export
        </button>
      )}
      {can('orders.create') && (
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-neutral-950"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          Create Order
        </button>
      )}
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [orders, can]);

  return (
    <AppShell title="Orders" subtitle="Filter, verify, deliver, and track every order." headerActions={headerActions}>
      <RequirePermission action="orders.view">
      <div className="grid w-full min-w-0 gap-4 md:gap-5">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-2 dark:border-neutral-800 dark:bg-neutral-900/80">
          <select
            aria-label="Filter by status"
            className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs text-neutral-700 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">Status: All</option>
            <option value="ordered">Ordered</option>
            <option value="verified">Verified</option>
            <option value="completed">Completed</option>
          </select>

          <select
            aria-label="Filter by product"
            className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs text-neutral-700 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
          >
            <option value="all">Product: All</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>

          <select
            aria-label="Filter by user status"
            className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs text-neutral-700 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
            value={filters.customer_status}
            onChange={(e) => setFilters({ ...filters, customer_status: e.target.value })}
          >
            <option value="all">User: All</option>
            <option value="new">New</option>
            <option value="renewal">Renewal</option>
          </select>

          <select
            aria-label="Sort by entry time"
            className="rounded-lg border border-neutral-300 bg-white/80 px-2.5 py-1.5 text-xs text-neutral-700 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
            value={filters.ordering}
            onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}
          >
            <option value="-entry_time">Newest first</option>
            <option value="entry_time">Oldest first</option>
          </select>

          <div className="relative min-w-[160px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              aria-label="Search by customer name or URL"
              className="w-full rounded-lg border border-neutral-300 bg-white/80 py-1.5 pl-8 pr-2.5 text-xs text-neutral-700 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:focus:border-white"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search customer or URL"
            />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5 dark:border-neutral-800/60 dark:bg-neutral-900/40">
          {wsDisconnected && <div className="mb-4 rounded-xl border border-amber-200/50 bg-amber-50/50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">Live socket disconnected. Auto-refresh is active every 15s.</div>}
          {actionError && <div className="mb-4 rounded-xl border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-300">{actionError}</div>}
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
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
                      {pagedOrders.map((order) => (
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
                            {getStatusCode(order) === 'ordered' && can('orders.verify') && (
                              <button className={`inline-flex whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} title="Verify" disabled={verifyingOrderId === order.id}>
                                {verifyingOrderId === order.id ? <Loader size={14} className="animate-spin" /> : '✔'} Verify
                              </button>
                            )}
                            {getStatusCode(order) === 'verified' && can('orders.deliver') && (
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
                {pagedOrders.map((order) => (
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
                        {getStatusCode(order) === 'ordered' && can('orders.verify') && (
                          <button className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${actionClass.verify}`} onClick={() => verifyOrder(order.id)} disabled={verifyingOrderId === order.id}>
                            {verifyingOrderId === order.id ? <Loader size={16} className="animate-spin" /> : '✔'} Verify Order
                          </button>
                        )}
                        {getStatusCode(order) === 'verified' && can('orders.deliver') && (
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

              <div className="mt-2">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={orders.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
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
      </RequirePermission>
    </AppShell>
  );
}

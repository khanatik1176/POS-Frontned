'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import ThemeToggle from '../components/ThemeToggle';
import CreateOrderModal from '../components/CreateOrderModal';
import DeliverOrderModal from '../components/DeliverOrderModal';
import { LogOut } from 'lucide-react';

const statusClass: Record<string, string> = {
  ordered: 'text-neutral-900 dark:text-white',
  verified: 'text-neutral-500 dark:text-neutral-300',
  completed: 'text-neutral-900 dark:text-white',
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
    if (nextFilters.status !== 'all') params.set('status', nextFilters.status);
    if (nextFilters.product !== 'all') params.set('product', nextFilters.product);
    if (nextFilters.customer_status !== 'all') params.set('customer_status', nextFilters.customer_status);
    if (nextFilters.ordering) params.set('ordering', nextFilters.ordering);
    if (nextFilters.search) params.set('search', nextFilters.search);
    return apiFetch<{ results?: Order[] } | Order[]>(`/orders/?${params.toString()}`);
  }, []);

  const loadData = useCallback(async (activeFilters: typeof initialFilters) => {
    try {
      setLoading(true);
      const [productData, orderData] = await Promise.all([
        apiFetch<Product[]>('/products/'),
        fetchOrders(activeFilters),
      ]);
      setProducts(productData);
      setOrders(Array.isArray(orderData) ? orderData : (orderData.results ?? []));
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
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
      if (!localStorage.getItem('accessToken')) return;
      try {
        const data = await fetchOrders(filters);
        setOrders(Array.isArray(data) ? data : (data.results ?? []));
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
    router.push('/');
  };

  const stats = useMemo(() => ({
    total: orders.length,
    ordered: orders.filter((o) => o.status === 'ordered').length,
    verified: orders.filter((o) => o.status === 'verified').length,
    completed: orders.filter((o) => o.status === 'completed').length,
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
                      {['Customer', 'URL', 'Platform', 'Product', 'Package', 'Qty', 'Payment', 'Primary Ref', 'Previous Ref', 'New Ref', 'Status', 'Customer Status', 'Entry Time', 'Actions'].map((head) => (
                        <th key={head} className="border-b border-neutral-300 px-3 py-3 text-left text-[11px] uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.customer_name}</td>
                        <td className="max-w-[210px] break-all border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700"><a href={order.url} target="_blank" rel="noreferrer">{order.url}</a></td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.platform_type}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.product_name}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.package_type_name}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.quantity}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700"><div>{order.payment_method}</div><div className="text-xs text-neutral-500 dark:text-neutral-300">{order.payment_medium}</div></td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.reference_number_value}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.previous_reference_value || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.delivered_reference_value || '—'}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700"><span className={`inline-flex rounded-full border border-current px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClass[order.status]}`}>{order.status}</span></td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{order.customer_status}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">{new Date(order.entry_time).toLocaleString()}</td>
                        <td className="border-b border-neutral-300 px-3 py-3 align-top dark:border-neutral-700">
                          {order.status === 'ordered' && (
                            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white/40 px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/40" onClick={() => verifyOrder(order.id)} title="Verify">✔ Verify</button>
                          )}
                          {order.status === 'verified' && (
                            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white/40 px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/40" onClick={() => setDeliveryOrder(order)} title="Delivered">📦 Deliver</button>
                          )}
                          {order.status === 'completed' && <span className="text-sm text-neutral-500 dark:text-neutral-300">Done</span>}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={14} className="border-b border-neutral-300 px-3 py-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">No orders found.</td>
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
                        <a href={order.url} target="_blank" rel="noreferrer" className="text-xs break-all text-neutral-500 dark:text-neutral-300">{order.url}</a>
                      </div>
                      <span className={`inline-flex rounded-full border border-current px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass[order.status]}`}>{order.status}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div><span className="text-neutral-500 dark:text-neutral-300">Platform:</span> {order.platform_type}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Product:</span> {order.product_name}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Package:</span> {order.package_type_name}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Qty:</span> {order.quantity}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Payment:</span> {order.payment_method}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Medium:</span> {order.payment_medium}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Primary Ref:</span> {order.reference_number_value}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Prev Ref:</span> {order.previous_reference_value || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">New Ref:</span> {order.delivered_reference_value || '—'}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-300">Customer:</span> {order.customer_status}</div>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-300">{new Date(order.entry_time).toLocaleString()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.status === 'ordered' && (
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white/40 px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/40" onClick={() => verifyOrder(order.id)} title="Verify">✔ Verify</button>
                      )}
                      {order.status === 'verified' && (
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white/40 px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/40" onClick={() => setDeliveryOrder(order)} title="Delivered">📦 Deliver</button>
                      )}
                      {order.status === 'completed' && <span className="text-xs text-neutral-500 dark:text-neutral-300">Done</span>}
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

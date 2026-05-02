'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import { Loader, User, Link2, Box, Package, Hash, CreditCard, CheckCircle, X, Facebook, Instagram, Youtube, Globe, Music2, CircleHelp } from 'lucide-react';
import ReferenceAutocomplete from './ReferenceAutocomplete';

interface Props {
  products: Product[];
  onClose: () => void;
  onCreated: (order: Order) => void;
}

type PackageOption = { id: number; name: string };

type PlatformProductItem = {
  id?: number | string;
  value?: number | string;
  name?: string;
  label?: string;
  title?: string;
  packages?: Array<{
    id?: number | string;
    value?: number | string;
    name?: string;
    label?: string;
    title?: string;
  }>;
};

type PlatformLookupItem = {
  id?: number | string;
  value?: string | number;
  key?: string;
  code?: string;
  slug?: string;
  name?: string;
  label?: string;
  title?: string;
  products?: PlatformProductItem[];
};

type PlatformLookupResponse = PlatformLookupItem[] | {
  results?: PlatformLookupItem[];
  data?: PlatformLookupItem[];
  items?: PlatformLookupItem[];
  platform_types?: PlatformLookupItem[];
  payment_methods?: PlatformLookupItem[];
  payment_mediums?: PlatformLookupItem[];
  payment_media?: PlatformLookupItem[];
  customer_statuses?: PlatformLookupItem[];
};

type FieldErrors = Partial<Record<
  'customer_name' | 'url' | 'products' | 'packageSelections' | 'quantity' | 'reference_number' | 'previous_reference',
  string
>>;

const defaultPlatformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'website', label: 'Website' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'other', label: 'Other' },
];

const getPlatformIcon = (platformCode: string) => {
  const key = platformCode.toLowerCase();

  if (['facebook', 'fb', 'meta'].includes(key)) return Facebook;
  if (['instagram', 'ig'].includes(key)) return Instagram;
  if (['youtube', 'yt'].includes(key)) return Youtube;
  if (['website', 'web', 'site', 'blog', 'landing-page'].includes(key)) return Globe;
  if (['tiktok', 'tik-tok'].includes(key)) return Music2;

  return CircleHelp;
};

const defaultPaymentMethodOptions = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
];

const defaultCustomerStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'renewal', label: 'Renewal' },
];

const defaultPaymentMediumOptions = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'mobile_banking', label: 'Mobile Banking' },
  { value: 'pos', label: 'POS' },
];



const extractLookupItems = (payload: PlatformLookupResponse, preferredKeys: string[] = []) => {
  if (Array.isArray(payload)) return payload;

  const keyOrder = [
    ...preferredKeys,
    'results',
    'data',
    'items',
    'platform_types',
    'payment_methods',
    'payment_mediums',
    'payment_media',
    'customer_statuses',
  ];

  for (const key of keyOrder) {
    const candidate = (payload as Record<string, unknown>)[key];
    if (Array.isArray(candidate)) {
      return candidate as PlatformLookupItem[];
    }
  }

  return [];
};

const normalizePlatformOptions = (payload: PlatformLookupResponse, preferredKeys: string[] = []) => {
  const raw = extractLookupItems(payload, preferredKeys);

  return raw
    .map((item) => {
      const value = item.value ?? item.key ?? item.code ?? item.slug ?? item.id;
      if (value === undefined || value === null) return null;
      const label = item.label ?? item.name ?? item.title ?? String(value);
      return { value: String(value), label: String(label) };
    })
    .filter((item): item is { value: string; label: string } => item !== null);
};

const normalizePlatformCatalog = (payload: PlatformLookupResponse) => {
  const rawPlatforms = extractLookupItems(payload, ['platform_types']);

  return rawPlatforms
    .map((item) => {
      const value = item.code ?? item.value ?? item.key ?? item.slug ?? item.id;
      if (value === undefined || value === null) return null;
      const label = item.name ?? item.label ?? item.title ?? String(value);
      const products: Product[] = (item.products ?? [])
        .map((product) => {
          const productId = Number(product.id ?? product.value);
          const productName = product.name ?? product.label ?? product.title;
          if (Number.isNaN(productId) || !productName) return null;

          const packages = (product.packages ?? [])
            .map((pack) => {
              const packId = Number(pack.id ?? pack.value);
              const packName = pack.name ?? pack.label ?? pack.title;
              if (Number.isNaN(packId) || !packName) return null;

              return { id: packId, name: String(packName) };
            })
            .filter((pack): pack is PackageOption => pack !== null);

          return {
            id: productId,
            name: String(productName),
            packages,
          };
        })
        .filter((product): product is Product => product !== null);
      return {
        value: String(value),
        label: String(label),
        products,
      };
    })
    .filter((item): item is { value: string; label: string; products: Product[] } => item !== null);
};

const isRenewalCustomerStatus = (
  selectedStatus: string,
  options: Array<{ value: string; label: string }>,
) => {
  const normalizedStatus = selectedStatus.trim().toLowerCase();
  if (normalizedStatus === 'renewal' || normalizedStatus.includes('renew')) return true;

  const matchedOption = options.find((option) => String(option.value) === String(selectedStatus));
  if (!matchedOption) return false;

  return matchedOption.label.trim().toLowerCase().includes('renew');
};

const fetchLookupWithFallback = async (
  endpoints: string[],
  preferredKeys: string[] = [],
): Promise<{ value: string; label: string }[]> => {
  for (const endpoint of endpoints) {
    try {
      const payload = await apiFetch<PlatformLookupResponse>(endpoint);
      const options = normalizePlatformOptions(payload, preferredKeys);
      if (options.length > 0) {
        return options;
      }
    } catch {
      // Try next endpoint candidate.
    }
  }

  return [];
};

const fetchPlatformCatalogWithFallback = async (endpoints: string[]): Promise<PlatformLookupResponse | null> => {
  for (const endpoint of endpoints) {
    try {
      return await apiFetch<PlatformLookupResponse>(endpoint);
    } catch {
      // Try next endpoint candidate.
    }
  }

  return null;
};

type PackageSelection = { productId: number; packageId: number };

export default function CreateOrderModal({onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    customer_name: '',
    url: '',
    platform_type: 'facebook',
    products: [] as string[],
    packageSelections: [] as PackageSelection[],
    quantity: 1,
    payment_method: 'bkash',
    payment_medium: 'online',
    reference_number: '',
    customer_status: 'new',
    previous_reference: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [platformOptions, setPlatformOptions] = useState(defaultPlatformOptions);
  const [platformCatalog, setPlatformCatalog] = useState<Array<{ value: string; label: string; products: Product[] }>>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState(defaultPaymentMethodOptions);
  const [customerStatusOptions, setCustomerStatusOptions] = useState(defaultCustomerStatusOptions);
  const [paymentMediumOptions, setPaymentMediumOptions] = useState(defaultPaymentMediumOptions);
  const shouldShowPreviousReference = useMemo(
    () => isRenewalCustomerStatus(form.customer_status, customerStatusOptions),
    [form.customer_status, customerStatusOptions],
  );

  const selectedProducts = useMemo(
    () => availableProducts.filter((item) => form.products.includes(item.name)),
    [form.products, availableProducts],
  );

  const togglePackageSelection = (productId: number, packageId: number) => {
    setForm((prev) => {
      const exists = prev.packageSelections.some(
        (sel) => sel.productId === productId && sel.packageId === packageId,
      );
      const nextSelections = exists
        ? prev.packageSelections.filter(
            (sel) => !(sel.productId === productId && sel.packageId === packageId),
          )
        : [...prev.packageSelections, { productId, packageId }];

      return {
        ...prev,
        packageSelections: nextSelections,
      };
    });
    setFieldErrors((prev) => ({ ...prev, packageSelections: undefined }));
  };

  const getSelectedPackagesForProduct = (productId: number): number[] => {
    return form.packageSelections
      .filter((sel) => sel.productId === productId)
      .map((sel) => sel.packageId);
  };

  const toggleProduct = (productName: string) => {
    setForm((prev) => {
      const exists = prev.products.includes(productName);
      const nextProducts = exists
        ? prev.products.filter((name) => name !== productName)
        : [...prev.products, productName];

      const nextPackageSelections = exists
        ? prev.packageSelections.filter((sel) => {
            const product = availableProducts.find((p) => p.name === productName);
            return product ? sel.productId !== product.id : true;
          })
        : prev.packageSelections;

      return {
        ...prev,
        products: nextProducts,
        packageSelections: nextPackageSelections,
      };
    });
    setFieldErrors((prev) => ({ ...prev, products: undefined, packageSelections: undefined }));
  };

  const validateForm = (): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (!form.customer_name.trim()) nextErrors.customer_name = 'Customer name is required.';

    if (!form.url.trim()) {
      nextErrors.url = 'URL is required.';
    } else {
      try {
        const parsed = new URL(form.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          nextErrors.url = 'URL must start with http:// or https://.';
        }
      } catch {
        nextErrors.url = 'Please enter a valid URL.';
      }
    }

    if (selectedProducts.length === 0) nextErrors.products = 'Please select at least one product.';
    if (form.packageSelections.length === 0) nextErrors.packageSelections = 'Please select at least one package.';
    if (!Number(form.quantity) || Number(form.quantity) < 1) nextErrors.quantity = 'Quantity must be at least 1.';
    if (!form.reference_number.trim()) nextErrors.reference_number = 'Reference number is required.';

    if (shouldShowPreviousReference && !form.previous_reference.trim()) {
      nextErrors.previous_reference = 'Previous reference is required for renewal.';
    }

    return nextErrors;
  };

  useEffect(() => {
    let isMounted = true;

    const loadLookups = async () => {
      setIsLoadingPlatforms(true);
      const [platformPayload, paymentMethodOptionsFromApi, customerStatusOptionsFromApi, paymentMediumOptionsFromApi] = await Promise.all([
        fetchPlatformCatalogWithFallback(['/lookups/platform-types/', '/platform-types/', '/lookups/']),
        fetchLookupWithFallback(['/lookups/payment-methods/', '/payment-methods/', '/lookups/'], ['payment_methods']),
        fetchLookupWithFallback(['/lookups/customer-statuses/', '/customer-statuses/', '/lookups/'], ['customer_statuses']),
        fetchLookupWithFallback(['/lookups/payment-mediums/', '/payment-mediums/', '/lookups/'], ['payment_mediums', 'payment_media']),
      ]);

      if (!isMounted) return;

      const platformCatalogFromApi = platformPayload ? normalizePlatformCatalog(platformPayload) : [];
      if (platformCatalogFromApi.length > 0) {
        setPlatformCatalog(platformCatalogFromApi);
        setPlatformOptions(platformCatalogFromApi.map((platform) => ({ value: platform.value, label: platform.label })));
        setForm((prev) => (
          platformCatalogFromApi.some((option) => option.value === prev.platform_type)
            ? prev
            : { ...prev, platform_type: platformCatalogFromApi[0].value }
        ));
      } else {
        setPlatformCatalog([]);
      }

      if (paymentMethodOptionsFromApi.length > 0) {
        setPaymentMethodOptions(paymentMethodOptionsFromApi);
        setForm((prev) => (
          paymentMethodOptionsFromApi.some((option) => option.value === prev.payment_method)
            ? prev
            : { ...prev, payment_method: paymentMethodOptionsFromApi[0].value }
        ));
      }

      if (customerStatusOptionsFromApi.length > 0) {
        setCustomerStatusOptions(customerStatusOptionsFromApi);
        setForm((prev) => (
          customerStatusOptionsFromApi.some((option) => option.value === prev.customer_status)
            ? prev
            : { ...prev, customer_status: customerStatusOptionsFromApi[0].value }
        ));
      }

      if (paymentMediumOptionsFromApi.length > 0) {
        setPaymentMediumOptions(paymentMediumOptionsFromApi);
        setForm((prev) => (
          paymentMediumOptionsFromApi.some((option) => option.value === prev.payment_medium)
            ? prev
            : { ...prev, payment_medium: paymentMediumOptionsFromApi[0].value }
        ));
      }
      setIsLoadingPlatforms(false);
    };

    loadLookups();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setIsLoadingProducts(true);
    const selectedPlatform = platformCatalog.find((platform) => platform.value === form.platform_type);
    setAvailableProducts(selectedPlatform?.products ?? []);
    setForm((prev) => ({
      ...prev,
      products: [],
      packageSelections: [],
    }));
    setIsLoadingProducts(false);
  }, [form.platform_type, platformCatalog]);

  useEffect(() => {
    setIsLoadingPackages(true);
    const handleLoadPackages = () => {
      setTimeout(() => setIsLoadingPackages(false), 300);
    };
    handleLoadPackages();
  }, [selectedProducts]);



  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const itemsMap = new Map<number, number[]>();
      form.packageSelections.forEach((selection) => {
        const productId = Number(selection.productId);
        const packageId = Number(selection.packageId);
        if (!itemsMap.has(productId)) itemsMap.set(productId, []);
        itemsMap.get(productId)!.push(packageId);
      });

      const items = Array.from(itemsMap.entries()).map(([productId, packageIds]) => ({
        product: productId,
        package_types: packageIds,
        quantity: Number(form.quantity),
      }));

      const payload = {
        customer_name: form.customer_name,
        url: form.url,
        platform_type: form.platform_type,
        quantity: Number(form.quantity),
        payment_method: form.payment_method,
        payment_medium: form.payment_medium,
        reference_number: form.reference_number,
        customer_status: form.customer_status,
        previous_reference: form.previous_reference,
        items,
      };

      const createdOrder = await apiFetch<Order>('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onCreated(createdOrder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[1000px] overflow-auto rounded-3xl border border-white/20 bg-white/80 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:my-0 md:p-8 dark:border-white/10 dark:bg-neutral-950/80 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="bg-gradient-to-br from-neutral-900 to-neutral-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-white dark:to-neutral-400">Create New Order</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Fill in the details below to initiate a new customer order.</p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/50 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form className="grid grid-cols-1 gap-8 lg:grid-cols-2" onSubmit={submit}>
          {/* LEFT COLUMN: CUSTOMER INFO & METADATA */}
          <div className="space-y-5 rounded-2xl border border-neutral-200/60 bg-white/40 p-5 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/40">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Customer Information</h3>

            <div className="relative pb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Customer Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <User size={16} />
                </div>
                <input className="w-full rounded-xl border border-neutral-300 bg-white/80 py-3 pl-10 pr-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" placeholder="e.g. Acme Corp" required value={form.customer_name} onChange={(e) => {
                  setForm({ ...form, customer_name: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, customer_name: undefined }));
                }} />
              </div>
              {fieldErrors.customer_name && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.customer_name}</p>}
            </div>

            <div className="relative pb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Website URL</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Link2 size={16} />
                </div>
                <input className="w-full rounded-xl border border-neutral-300 bg-white/80 py-3 pl-10 pr-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" placeholder="https://" type="url" required value={form.url} onChange={(e) => {
                  setForm({ ...form, url: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, url: undefined }));
                }} />
              </div>
              {fieldErrors.url && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.url}</p>}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Platform Type</label>
              {isLoadingPlatforms ? (
                <div className="flex h-20 items-center justify-center rounded-xl border border-neutral-200 bg-white/50 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <Loader size={20} className="animate-spin text-neutral-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {platformOptions.map((option) => {
                    const isSelected = form.platform_type === option.value;
                    const Icon = getPlatformIcon(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, platform_type: option.value, products: [], packageSelections: [] })}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-md dark:border-white dark:bg-white dark:text-neutral-900'
                            : 'border-neutral-200 bg-white/80 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-900'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-[10px] font-medium uppercase tracking-wider">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Payment Method</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                    <CreditCard size={14} />
                  </div>
                  <select className="w-full appearance-none rounded-xl border border-neutral-300 bg-white/80 py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Medium</label>
                <select className="w-full rounded-xl border border-neutral-300 bg-white/80 py-2.5 px-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_medium} onChange={(e) => setForm({ ...form, payment_medium: e.target.value })}>
                  {paymentMediumOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative pb-5">
                <ReferenceAutocomplete
                  label="Reference Number"
                  icon={<Hash size={14} />}
                  value={form.reference_number}
                  onChange={(value) => {
                    setForm({ ...form, reference_number: value });
                    setFieldErrors((prev) => ({ ...prev, reference_number: undefined }));
                  }}
                />
                {fieldErrors.reference_number && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.reference_number}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Customer Status</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                    <CheckCircle size={14} />
                  </div>
                  <select className="w-full appearance-none rounded-xl border border-neutral-300 bg-white/80 py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.customer_status} onChange={(e) => setForm({ ...form, customer_status: e.target.value })}>
                    {customerStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {shouldShowPreviousReference && (
              <div className="relative pb-5">
                <ReferenceAutocomplete
                  label="Previous Reference"
                  icon={<Hash size={14} />}
                  value={form.previous_reference}
                  onChange={(value) => {
                    setForm({ ...form, previous_reference: value });
                    setFieldErrors((prev) => ({ ...prev, previous_reference: undefined }));
                  }}
                />
                {fieldErrors.previous_reference && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.previous_reference}</p>}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ORDER DETAILS */}
          <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-neutral-200/60 bg-white/40 p-5 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/40">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Order Details</h3>

              <div className="relative pb-5">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                  <Box size={14} /> Select Products
                </label>
                
                {isLoadingProducts ? (
                  <div className="flex h-12 items-center px-4 text-sm text-neutral-500"><Loader size={16} className="mr-2 animate-spin" /> Loading products...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableProducts.map((product) => {
                      const isSelected = form.products.includes(product.name);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.name)}
                          className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
                              : 'border-neutral-200 bg-white/80 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          {product.name}
                        </button>
                      );
                    })}
                    {availableProducts.length === 0 && <span className="text-sm text-neutral-400">No products available.</span>}
                  </div>
                )}
                {fieldErrors.products && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.products}</p>}
              </div>

              <div className="relative pb-5">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                  <Package size={14} /> Select Packages
                </label>
                {isLoadingPackages ? (
                  <div className="flex items-center rounded-xl border border-neutral-200 bg-white/50 p-6 dark:border-neutral-800 dark:bg-neutral-950/50">
                    <Loader size={20} className="mr-3 animate-spin text-neutral-400" />
                    <span className="text-sm text-neutral-500">Loading packages...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProducts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/50">
                        Please select products above to view their available packages.
                      </div>
                    ) : (
                      selectedProducts.map((product) => (
                        <div key={product.id} className="rounded-xl border border-neutral-200/60 bg-white/60 p-4 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900/60">
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{product.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.packages.map((pack) => {
                              const isSelected = getSelectedPackagesForProduct(product.id).includes(pack.id);
                              return (
                                <button
                                  key={pack.id}
                                  type="button"
                                  onClick={() => togglePackageSelection(product.id, pack.id)}
                                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-900/30 dark:text-emerald-300'
                                      : 'border-neutral-200 bg-white/80 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-neutral-400 dark:hover:border-neutral-600'
                                  }`}
                                >
                                  {pack.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {fieldErrors.packageSelections && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.packageSelections}</p>}
              </div>

              <div className="relative pb-5">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                  <Hash size={14} /> Quantity
                </label>
                <input className="w-1/3 min-w-[120px] rounded-xl border border-neutral-300 bg-white/80 py-2.5 px-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="number" min={1} value={form.quantity} onChange={(e) => {
                  setForm({ ...form, quantity: Number(e.target.value) });
                  setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
                }} />
                {fieldErrors.quantity && <p className="absolute bottom-0 left-0 text-[11px] font-medium text-red-500">{fieldErrors.quantity}</p>}
              </div>
            </div>

            <div className="pt-4">
              <button className="relative w-full overflow-hidden rounded-xl bg-neutral-900 p-[1px] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white" disabled={saving} type="submit">
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 dark:opacity-40" />
                <div className="relative flex w-full items-center justify-center gap-2 rounded-[11px] bg-neutral-900 px-4 py-3.5 text-sm font-bold tracking-wide text-white transition-colors dark:bg-white dark:text-neutral-950">
                  {saving ? (
                    <><Loader size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    'Create Order & Initiate'
                  )}
                </div>
              </button>
              {error && <div className="mt-3 text-center text-sm font-medium text-red-500">{error}</div>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

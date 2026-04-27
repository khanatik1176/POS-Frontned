'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Order, Product } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReferenceAutocomplete from './ReferenceAutocomplete';

interface Props {
  products: Product[];
  onClose: () => void;
  onCreated: (order: Order) => void;
}

type PackageOption = { id: number; name: string };
type LocalProduct = Product & { platformKeys: string[] };

type PlatformLookupItem = {
  id?: number | string;
  value?: string | number;
  key?: string;
  code?: string;
  slug?: string;
  name?: string;
  label?: string;
  title?: string;
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
  'customer_name' | 'url' | 'products' | 'package_type' | 'quantity' | 'reference_number' | 'previous_reference',
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

const normalizePlatformKey = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  if (typeof value === 'number') return String(value);
  return null;
};

const getProductPlatformKeys = (product: Record<string, unknown>): string[] => {
  const keys = new Set<string>();

  const directCandidates = [
    product.platform_type,
    product.platform,
    product.platform_code,
    product.platform_slug,
    product.platform_name,
  ];

  directCandidates.forEach((candidate) => {
    const normalized = normalizePlatformKey(candidate);
    if (normalized) keys.add(normalized);
  });

  const listCandidates = [product.platforms, product.platform_types];
  listCandidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((entry) => {
      if (typeof entry === 'string' || typeof entry === 'number') {
        const normalized = normalizePlatformKey(entry);
        if (normalized) keys.add(normalized);
        return;
      }

      if (entry && typeof entry === 'object') {
        const typedEntry = entry as Record<string, unknown>;
        const nestedCandidates = [typedEntry.code, typedEntry.slug, typedEntry.value, typedEntry.id, typedEntry.name];
        nestedCandidates.forEach((nested) => {
          const normalized = normalizePlatformKey(nested);
          if (normalized) keys.add(normalized);
        });
      }
    });
  });

  return Array.from(keys);
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

const normalizeProductsPayload = (payload: Product[] | Record<string, unknown>): LocalProduct[] => {
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
        .filter((item): item is PackageOption => item !== null);

      const id = Number(idValue);
      if (Number.isNaN(id)) return null;

      return {
        id,
        name: String(nameValue),
        packages,
        platformKeys: getProductPlatformKeys(product),
      };
    })
    .filter((item): item is LocalProduct => item !== null);
};

const normalizePackagePayload = (payload: Record<string, unknown> | Array<unknown>): PackageOption[] => {
  const rawPackages = extractArrayFromPayload(payload, ['package_types', 'packages']);

  return rawPackages
    .map((entry) => {
      const pack = entry as Record<string, unknown>;
      const idValue = pack.id ?? pack.value;
      const nameValue = pack.name ?? pack.package_name ?? pack.title ?? pack.label;
      if (idValue === undefined || nameValue === undefined || nameValue === null) {
        return null;
      }

      const id = Number(idValue);
      if (Number.isNaN(id)) return null;

      return { id, name: String(nameValue) };
    })
    .filter((item): item is PackageOption => item !== null);
};



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

export default function CreateOrderModal({onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    customer_name: '',
    url: '',
    platform_type: 'facebook',
    products: [] as string[],
    package_type: '',
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
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const productMenuRef = useRef<HTMLDivElement | null>(null);
  const [availableProducts, setAvailableProducts] = useState<LocalProduct[]>([]);
  const [apiPackages, setApiPackages] = useState<PackageOption[]>([]);
  const [platformOptions, setPlatformOptions] = useState(defaultPlatformOptions);
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

  const mergedPackages = useMemo(() => {
    const mergedPackages = new Map<number, { id: number; name: string }>();
    selectedProducts.forEach((product) => {
      product.packages.forEach((pack) => {
        if (!mergedPackages.has(pack.id)) {
          mergedPackages.set(pack.id, pack);
        }
      });
    });
    return Array.from(mergedPackages.values());
  }, [selectedProducts]);

  const packages = useMemo(() => {
    if (apiPackages.length > 0) return apiPackages;
    return mergedPackages;
  }, [apiPackages, mergedPackages]);

  const toggleProduct = (productName: string) => {
    setForm((prev) => {
      const exists = prev.products.includes(productName);
      const nextProducts = exists
        ? prev.products.filter((name) => name !== productName)
        : [...prev.products, productName];

      return {
        ...prev,
        products: nextProducts,
        package_type: '',
      };
    });
    setFieldErrors((prev) => ({ ...prev, products: undefined, package_type: undefined }));
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
    if (!form.package_type) nextErrors.package_type = 'Please select a package type.';
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
      const [platformOptionsFromApi, paymentMethodOptionsFromApi, customerStatusOptionsFromApi, paymentMediumOptionsFromApi] = await Promise.all([
        fetchLookupWithFallback(['/lookups/platform-types/', '/platform-types/', '/lookups/'], ['platform_types']),
        fetchLookupWithFallback(['/lookups/payment-methods/', '/payment-methods/', '/lookups/'], ['payment_methods']),
        fetchLookupWithFallback(['/lookups/customer-statuses/', '/customer-statuses/', '/lookups/'], ['customer_statuses']),
        fetchLookupWithFallback(['/lookups/payment-mediums/', '/payment-mediums/', '/lookups/'], ['payment_mediums', 'payment_media']),
      ]);

      if (!isMounted) return;

      if (platformOptionsFromApi.length > 0) {
        setPlatformOptions(platformOptionsFromApi);
        setForm((prev) => (
          platformOptionsFromApi.some((option) => option.value === prev.platform_type)
            ? prev
            : { ...prev, platform_type: platformOptionsFromApi[0].value }
        ));
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
    };

    loadLookups();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProductsByPlatform = async () => {
      const encodedPlatform = encodeURIComponent(form.platform_type);
      const endpoints = [
        `/products/?platform_type=${encodedPlatform}`,
        `/products/?platformType=${encodedPlatform}`,
        `/products/?platform=${encodedPlatform}`,
        `/products/?platform_code=${encodedPlatform}`,
        `/products/?platformCode=${encodedPlatform}`,
        `/product-names/?platform_type=${encodedPlatform}`,
        `/lookups/products/?platform_type=${encodedPlatform}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const payload = await apiFetch<Product[] | Record<string, unknown>>(endpoint);
          const normalized = normalizeProductsPayload(payload);
          if (!isMounted) return;

          if (normalized.length > 0) {
            setAvailableProducts(normalized);
            return;
          }
        } catch {
          // Try next endpoint.
        }
      }

      if (!isMounted) return;
      setAvailableProducts([]);
    };

    loadProductsByPlatform();

    return () => {
      isMounted = false;
    };
  }, [form.platform_type]);

  useEffect(() => {
    let isMounted = true;

    const loadPackages = async () => {
      if (selectedProducts.length === 0) {
        setApiPackages([]);
        return;
      }

      const packageMap = new Map<number, PackageOption>();
      const fallbackSources = [
        (productId: number) => `/package-types/?product=${productId}`,
        (productId: number) => `/packages/?product=${productId}`,
        (productId: number) => `/product-packages/?product=${productId}`,
      ];

      for (const product of selectedProducts) {
        let loadedForProduct = false;
        const allowedPackageIds = new Set(product.packages.map((pack) => pack.id));

        for (const makePath of fallbackSources) {
          try {
            const payload = await apiFetch<Record<string, unknown> | Array<unknown>>(makePath(product.id));
            const normalized = normalizePackagePayload(payload);
            const filteredPackages = allowedPackageIds.size > 0
              ? normalized.filter((pack) => allowedPackageIds.has(pack.id))
              : normalized;

            if (filteredPackages.length > 0) {
              filteredPackages.forEach((pack) => packageMap.set(pack.id, pack));
              loadedForProduct = true;
              break;
            }
          } catch {
            // Try next package endpoint.
          }
        }

        if (!loadedForProduct) {
          product.packages.forEach((pack) => packageMap.set(pack.id, pack));
        }
      }

      if (!isMounted) return;
      setApiPackages(Array.from(packageMap.values()));
    };

    loadPackages();

    return () => {
      isMounted = false;
    };
  }, [selectedProducts]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!productMenuRef.current) return;
      if (!productMenuRef.current.contains(target)) {
        setIsProductMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const createdOrders = await Promise.all(
        selectedProducts.map((product) => {
          const payload = {
            customer_name: form.customer_name,
            url: form.url,
            platform_type: form.platform_type,
            product: Number(product.id),
            package_type: Number(form.package_type),
            quantity: Number(form.quantity),
            payment_method: form.payment_method,
            payment_medium: form.payment_medium,
            reference_number: form.reference_number,
            customer_status: form.customer_status,
            previous_reference: form.previous_reference,
          };

          return apiFetch<Order>('/orders/', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }),
      );

      createdOrders.forEach((order) => onCreated(order));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center md:p-5">
      <div className="my-2 max-h-[95vh] w-full max-w-[900px] overflow-auto rounded-[18px] border border-neutral-300 bg-white/90 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_58px_-36px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:my-0 md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_58px_-36px_rgba(255,255,255,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight md:text-2xl">Create Order</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">Entry time will be saved automatically by the system.</p>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-3 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={submit}>
          <div className="relative pb-5">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Customer Name</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" required value={form.customer_name} onChange={(e) => {
              setForm({ ...form, customer_name: e.target.value });
              setFieldErrors((prev) => ({ ...prev, customer_name: undefined }));
            }} />
            {fieldErrors.customer_name && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.customer_name}</p>}
          </div>
          <div className="relative pb-5">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">URL</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="url" required value={form.url} onChange={(e) => {
              setForm({ ...form, url: e.target.value });
              setFieldErrors((prev) => ({ ...prev, url: undefined }));
            }} />
            {fieldErrors.url && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.url}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Platform Type</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.platform_type} onChange={(e) => setForm({ ...form, platform_type: e.target.value, products: [], package_type: '' })}>
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative pb-5" ref={productMenuRef}>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Product Name</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProductMenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-left text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15"
              >
                <span>
                  {form.products.length > 0 ? `${form.products.length} product(s) selected` : 'Select products'}
                </span>
                <span className="text-neutral-500 dark:text-neutral-300">
                  {isProductMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {isProductMenuOpen && (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-neutral-300 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {availableProducts.map((product) => {
                    const checked = form.products.includes(product.name);
                    return (
                      <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(product.name)}
                          className="h-4 w-4"
                        />
                        <span>{product.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {form.products.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.products.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">
                    {name}
                    <button
                      type="button"
                      onClick={() => toggleProduct(name)}
                      className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      aria-label={`Remove ${name}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            {fieldErrors.products && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.products}</p>}
          </div>

          <div className="relative pb-5">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Package Type</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" required value={form.package_type} onChange={(e) => {
              setForm({ ...form, package_type: e.target.value });
              setFieldErrors((prev) => ({ ...prev, package_type: undefined }));
            }}>
              <option value="">Select package</option>
              {packages.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
            {fieldErrors.package_type && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.package_type}</p>}
          </div>

          <div className="relative pb-5">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Quantity</label>
            <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" type="number" min={1} value={form.quantity} onChange={(e) => {
              setForm({ ...form, quantity: Number(e.target.value) });
              setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
            }} />
            {fieldErrors.quantity && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.quantity}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Payment Method</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Payment Medium</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.payment_medium} onChange={(e) => setForm({ ...form, payment_medium: e.target.value })}>
              {paymentMediumOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="relative pb-5">
            <ReferenceAutocomplete
              label="Reference Number"
              value={form.reference_number}
              onChange={(value) => {
                setForm({ ...form, reference_number: value });
                setFieldErrors((prev) => ({ ...prev, reference_number: undefined }));
              }}
            />
            {fieldErrors.reference_number && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.reference_number}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Customer Status</label>
            <select className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15" value={form.customer_status} onChange={(e) => setForm({ ...form, customer_status: e.target.value })}>
              {customerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {shouldShowPreviousReference && (
            <div className="relative pb-5">
              <ReferenceAutocomplete
                label="Previous Reference"
                value={form.previous_reference}
                onChange={(value) => {
                  setForm({ ...form, previous_reference: value });
                  setFieldErrors((prev) => ({ ...prev, previous_reference: undefined }));
                }}
              />
              {fieldErrors.previous_reference && <p className="absolute bottom-0 left-0 text-xs text-red-600">{fieldErrors.previous_reference}</p>}
            </div>
          )}

          <div className="md:col-span-2">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-3.5 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-neutral-950" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Create Order'}
            </button>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}

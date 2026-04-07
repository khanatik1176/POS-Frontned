import {
  CreateOrderPayload,
  MasterDataResponse,
  OrderListItem,
  ReferenceItem,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("token")
      : null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || JSON.stringify(errorData) || "Request failed");
  }

  return res.json();
}

export function apiFetch<T>(endpoint: string, options: RequestInit = {}) {
  return request<T>(endpoint, options);
}

export const api = {
  getMasterData: () => request<MasterDataResponse>("/master-data/"),

  getOrders: (params?: {
    search?: string;
    status?: string;
    product_id?: string;
    customer_status?: string;
    ordering?: string;
  }) => {
    const searchParams = new URLSearchParams();

    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.product_id) searchParams.set("product_id", params.product_id);
    if (params?.customer_status) searchParams.set("customer_status", params.customer_status);
    if (params?.ordering) searchParams.set("ordering", params.ordering);

    const query = searchParams.toString();
    return request<OrderListItem[]>(`/orders/${query ? `?${query}` : ""}`);
  },

  createOrder: (payload: CreateOrderPayload) =>
    request<OrderListItem>("/orders/create/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyOrder: (orderId: number) =>
    request<OrderListItem>(`/orders/${orderId}/verify/`, {
      method: "POST",
    }),

  completeOrder: (orderId: number, newReferenceNumber: string) =>
    request<OrderListItem>(`/orders/${orderId}/complete/`, {
      method: "POST",
      body: JSON.stringify({
        new_reference_number: newReferenceNumber,
      }),
    }),

  searchReferences: (q: string) =>
    request<ReferenceItem[]>(`/references/search/?q=${encodeURIComponent(q)}`),
};
import axios, { AxiosHeaders, AxiosRequestConfig, isAxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefixed = `${name}=`;
  const parts = document.cookie.split(';').map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(prefixed));
  return found ? decodeURIComponent(found.slice(prefixed.length)) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken') || localStorage.getItem('token')
    : null;
  const csrfToken = typeof window !== 'undefined'
    ? localStorage.getItem('csrftoken') || getCookie('csrftoken')
    : null;

  const baseHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    baseHeaders['X-CSRFTOKEN'] = csrfToken;
  }

  const headers = new AxiosHeaders(baseHeaders);

  const extraHeaders = options.headers as Record<string, string> | undefined;
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }

  const requestConfig: AxiosRequestConfig = {
    url: path.startsWith('http://') || path.startsWith('https://') ? path : `${API_URL}${path}`,
    method: (options.method || 'GET') as AxiosRequestConfig['method'],
    headers,
    data: options.body,
    withCredentials: true,
  };

  try {
    const response = await axios.request<T>(requestConfig);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        window.location.href = '/';
      }

      const detail = typeof error.response?.data === 'object' && error.response?.data && 'detail' in error.response.data
        ? String((error.response.data as Record<string, unknown>).detail)
        : null;
      const responseData = error.response?.data;
      const nonEmptyJson = responseData && typeof responseData === 'object' && Object.keys(responseData as Record<string, unknown>).length > 0
        ? JSON.stringify(responseData)
        : null;
      const nonEmptyText = typeof responseData === 'string' && responseData.trim() ? responseData : null;
      const fallback = `Request failed (${error.response?.status || 'unknown'} ${error.response?.statusText || 'error'}).`;
      throw new Error(detail || nonEmptyJson || nonEmptyText || fallback);
    }

    throw new Error('Network request failed.');
  }
}

export { API_URL };

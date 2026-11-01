import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});
export const api = axios.create({ baseURL: '/api', withCredentials: true });
let csrfPromise: Promise<string> | undefined;
async function csrf() {
  if (!csrfPromise)
    csrfPromise = axios
      .get('/api/csrf', { withCredentials: true })
      .then((r) => r.data.data.token as string)
      .catch((e) => {
        csrfPromise = undefined;
        throw e;
      });
  return csrfPromise;
}
api.interceptors.request.use(async (c) => {
  if (!['get', 'head', 'options'].includes(c.method || 'get'))
    c.headers['X-CSRF-Token'] = await csrf();
  return c;
});
let refreshing: Promise<unknown> | undefined;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const c = error.config;
    if (
      error.response?.status === 401 &&
      !c._retry &&
      ![
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/logout',
        '/auth/forgot-password',
        '/auth/reset-password',
      ].includes(c.url)
    ) {
      c._retry = true;
      try {
        refreshing ??= api.post('/auth/refresh').finally(() => {
          refreshing = undefined;
        });
        await refreshing;
        return api(c);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
export async function get<T>(url: string): Promise<T> {
  return (await api.get<{ data: T }>(url)).data.data;
}
export async function post<T>(
  url: string,
  data?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return (await api.post<{ data: T }>(url, data, { headers })).data.data;
}
export async function patch<T>(url: string, data: unknown): Promise<T> {
  return (await api.patch<{ data: T }>(url, data)).data.data;
}
export async function remove(url: string) {
  return api.delete(url);
}
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.error?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.'
    : error instanceof Error
      ? error.message
      : 'Có lỗi xảy ra';
}
export const money = (value: string | number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
export const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

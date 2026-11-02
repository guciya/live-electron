import axios, { type AxiosResponse } from 'axios';
import { NIKO_CONFIG } from './config';
import { readStoredAuthToken, useAuthStore } from './store/auth';

/** 后端统一响应结构 */
export interface NikoApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const AUTH_ERROR_MESSAGES = ['请先登录', 'token过期', '未登录'];

let redirectingToLogin = false;

function handleAuthFailure(url: string, message?: string) {
  let tokenInStore = 'unknown';
  try {
    tokenInStore = useAuthStore().token ? 'yes' : 'no';
  } catch (error) {
    tokenInStore = 'store-error';
  }
  console.warn('[NikoAuth] auth failure -> logout & redirect login:', {
    url,
    message,
    tokenInStore,
    tokenInStorage: readStoredAuthToken() ? 'yes' : 'no',
  });
  if (redirectingToLogin) {
    return;
  }
  redirectingToLogin = true;
  try {
    useAuthStore().logout();
  } catch (error) {
    console.warn('[NikoAuth] logout failed, continue redirect to login page');
  }
  // 跳转到登录页
  import('../router').then(({ default: router }) => {
    if (router.currentRoute.value.path === '/login') {
      redirectingToLogin = false;
      return;
    }
    router.replace({ path: '/login' }).finally(() => {
      redirectingToLogin = false;
    });
  });
}

export const request = axios.create({
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', platform: 'h5' },
});

request.interceptors.request.use((config) => {
  // Electron 桌面端无浏览器跨域限制，直接使用绝对 baseURL
  if (config.url?.startsWith('/api')) {
    config.baseURL = NIKO_CONFIG.authBaseUrl;
  } else {
    config.baseURL = NIKO_CONFIG.apiBaseUrl;
  }

  // 直播业务接口使用 Token 头。
  // token 以 localStorage 为准（登录时写入），优先同步到 pinia，避免窗口重建后
  // store 未恢复导致请求不带鉴权头，被后端判定为「请先登录」。
  let token = readStoredAuthToken();
  try {
    const authStore = useAuthStore();
    if (authStore.token) {
      token = authStore.token;
    } else if (token) {
      authStore.restore();
    }
  } catch (error) {
    console.warn('[NikoAuth] pinia store unavailable, fallback to localStorage token');
  }
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, unknown>).Token = token;
  }
  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse<NikoApiResponse>) => {
    const body = response.data;
    if (body.code === 200) {
      return body.data as any;
    }
    console.warn('[NikoAuth] response not ok:', response.config.url, {
      code: body.code,
      message: body.message,
      status: response.status,
    });
    if (body.code === 401 || AUTH_ERROR_MESSAGES.some((text) => body.message?.includes(text))) {
      handleAuthFailure(String(response.config.url || ''), body.message);
    }
    return Promise.reject(new Error(body.message || '请求失败'));
  },
  (error) => {
    const status = error?.response?.status;
    const body = error?.response?.data;
    // 打印完整状态码与响应体，便于定位后端 5xx（如 /live/stopLive 500）
    console.error('[NikoRequest] HTTP', status, error?.config?.url, body);
    const bodyMessage = typeof body === 'string' ? body.slice(0, 200) : body?.message;
    const message = bodyMessage || error.message || '网络异常';
    if (AUTH_ERROR_MESSAGES.some((text) => message.includes(text))) {
      handleAuthFailure(String(error?.config?.url || ''), message);
    }
    return Promise.reject(new Error(message));
  },
);

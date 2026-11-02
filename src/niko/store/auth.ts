import { defineStore } from 'pinia';

export interface NikoUserInfo {
  /** 后端 user_id，同时作为 TRTC userId 与 IM userID */
  userId: string;
  userShowId: string;
  nickname: string;
  avatar: string;
  /** 登录接口下发的 sign，TRTC 与 IM 的 UserSig 共用 */
  userSig: string;
  fansCount: number;
}

interface PersistedSession {
  token: string;
  userInfo: NikoUserInfo;
}

const STORAGE_KEY = 'niko-auth';

function readSession(): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.userInfo?.userId || !parsed?.userInfo?.userSig) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[niko/auth] failed to restore session:', error);
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * 直接从 localStorage 读取 token。
 * 业务请求的鉴权头不依赖 pinia 内存状态，避免窗口重建 / store 未恢复时
 * 请求缺少 Token 而被后端判定为「请先登录」。
 */
export function readStoredAuthToken(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return '';
    }
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === 'string' ? parsed.token : '';
  } catch (error) {
    return '';
  }
}

export const useAuthStore = defineStore('niko-auth', {
  state: () => ({
    token: '' as string,
    userInfo: null as NikoUserInfo | null,
  }),

  getters: {
    isLogin: (state): boolean => !!state.token && !!state.userInfo,
  },

  actions: {
    /** 应用启动时恢复登录态 */
    restore() {
      const session = readSession();
      if (!session) {
        return;
      }
      this.token = session.token;
      this.userInfo = session.userInfo;
    },

    setSession(token: string, userInfo: NikoUserInfo) {
      if (!token) {
        // 后端登录响应缺少 token 时，业务接口会一律返回「请先登录」
        console.error('[niko/auth] setSession received an empty token, business APIs will fail');
      }
      this.token = token;
      this.userInfo = userInfo;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, userInfo }));
    },

    logout() {
      this.token = '';
      this.userInfo = null;
      window.localStorage.removeItem(STORAGE_KEY);
    },
  },
});

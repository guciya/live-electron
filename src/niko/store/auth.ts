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

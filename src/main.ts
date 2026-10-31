import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import 'tuikit-atomicx-vue3-electron/styles'
import './TUILiveKit/assets/theme.css'
import { addI18n } from 'tuikit-atomicx-vue3-electron';
import {
  enResource,
  zhResource,
  zhTWResource,
  jaResource,
  koResource,
} from './i18n';
import { initLanguageSync } from './i18n/sync';
import { buildBeautyTranslation } from './i18n/beauty';
import { beauty as beautyZhCN } from './i18n/zh-CN/beauty';
import { beauty as beautyEnUS } from './i18n/en-US/beauty';
import { beauty as beautyZhTW } from './i18n/zh-TW/beauty';
import { beauty as beautyJaJP } from './i18n/ja-JP/beauty';
import { beauty as beautyKoKR } from './i18n/ko-KR/beauty';

import App from './App.vue'
import { useAuthStore, readStoredAuthToken } from './niko/store/auth'
import { USER_INFO_STORAGE_KEY } from './TUILiveKit/utils/userInfoStorage'
import { showMessage, MessageToastType } from './TUILiveKit/base-component/MessageToast'
import { NIKO_CONFIG } from './niko/config'
import { getUserPersonalInfo } from './niko/api/user'
import './niko/utils/time'

// 托盘菜单业务入口：URL 全部由渲染进程按环境（.env.test / .env.production）拼接，主进程不感知域名
window.ipcRenderer?.on('show-feature-pending', (_event: unknown, label: string) => {
  showMessage({ type: MessageToastType.Info, message: `${label}功能暂未开放，敬请期待` });
});
// 家族入驻 / 公会入驻：h5-organization-settled（HashRouter），统一落到入驻首页 #/settle
window.ipcRenderer?.on('open-settle-page', (_event: unknown, title: string) => {
  window.ipcRenderer?.send('open-internal-url', {
    url: `${NIKO_CONFIG.h5WebBase}/organization-settled/#/settle`,
    title: title || '入驻申请',
    sso: {
      token: readStoredAuthToken(),
      origin: NIKO_CONFIG.h5WebBase,
    },
  });
});
// 提现：按当前环境打开 withdraw 子应用
window.ipcRenderer?.on('open-withdraw-page', () => {
  window.ipcRenderer?.send('open-internal-url', {
    url: `${NIKO_CONFIG.h5WebBase}/withdraw/`,
    title: '提现',
    sso: {
      token: readStoredAuthToken(),
      origin: NIKO_CONFIG.h5WebBase,
    },
  })
})

// 公会|家族：组织页需要组织 id，用个人信息接口的 organization_info.id 带过去
window.ipcRenderer?.on('open-organization-page', async () => {
  let organizationId: number | undefined;
  try {
    const info = await getUserPersonalInfo();
    organizationId = info?.organization_info?.id ?? undefined;
  } catch (error) {
    console.warn('[main] load personal info before opening organization page failed:', error);
  }
  window.ipcRenderer?.send('open-internal-url', {
    url: `${NIKO_CONFIG.h5WebBase}/organization/`,
    title: '公会|家族',
    sso: {
      token: readStoredAuthToken(),
      origin: NIKO_CONFIG.h5WebBase,
      organizationId,
    },
  });
});

// Beauty panel baseline translations derived from the xmagic plugin's built-in
// labelKey table (zh / en only). Kept as a LAST-RESORT fallback so any labelKey
// the app maps below happen to miss still resolves to the plugin's zh/en text
// rather than the raw key.
const beautyZh = buildBeautyTranslation('zh');
const beautyEn = buildBeautyTranslation('en');

// i18n merge order (later wins): plugin baseline (zh/en) < app per-language
// beauty map (full 5-language, keyed by labelKey, in src/i18n/<lang>/beauty.ts)
// < app UI strings (src/i18n/<lang>/index.ts). This is what lets zh-TW / ja-JP /
// ko-KR finally show their own beauty text instead of falling back to zh / en.
addI18n('en-US', { translation: { ...beautyEn, ...beautyEnUS, ...enResource } });
addI18n('zh-CN', { translation: { ...beautyZh, ...beautyZhCN, ...zhResource } });
addI18n('zh-TW', { translation: { ...beautyZh, ...beautyZhTW, ...zhTWResource } });
addI18n('ja-JP', { translation: { ...beautyEn, ...beautyJaJP, ...jaResource } });
addI18n('ko-KR', { translation: { ...beautyEn, ...beautyKoKR, ...koResource } });
initLanguageSync();

const RELOGIN_ON_START_FLAG = 'niko-relogin-on-start-done';

/**
 * 每次启动应用都要求重新登录。
 * 主窗口启动时清掉上次遗留的登录态（TUIKit 凭据 + 业务 token），
 * 避免带着旧凭据直接进直播间。
 * 用 sessionStorage 标记，使开发时的页面热重载不会反复把用户踢回登录页。
 */
async function clearStaleLoginOnStart() {
  try {
    if (!window.ipcRenderer?.invoke) {
      return;
    }
    const windowType = await window.ipcRenderer.invoke('window-type');
    if (windowType !== 'main') {
      return;
    }
    if (window.sessionStorage.getItem(RELOGIN_ON_START_FLAG)) {
      return;
    }
    window.sessionStorage.setItem(RELOGIN_ON_START_FLAG, '1');
    window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
    window.localStorage.removeItem('niko-auth');
    console.log('[Niko] stale login cleared, login required this launch');
  } catch (error) {
    console.warn('[Niko] clear stale login failed:', error);
  }
}

async function bootstrap() {
  await clearStaleLoginOnStart();

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia).use(router);

  // 恢复本地登录态（本次启动已清空，需要重新登录后会重新写入）
  useAuthStore(pinia).restore();

  app.mount('#app');
}

bootstrap();

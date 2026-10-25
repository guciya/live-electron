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
import { useAuthStore } from './niko/store/auth'
import { USER_INFO_STORAGE_KEY } from './TUILiveKit/utils/userInfoStorage'
import { showMessage, MessageToastType } from './TUILiveKit/base-component/MessageToast'
import { NIKO_CONFIG } from './niko/config'

// 托盘菜单业务入口：「公会|家族 / 提现」暂未开放提示；「家族入驻 / 公会入驻」内部窗口打开入驻页
// （URL 由渲染进程按环境拼接，主进程不感知环境域名）
window.ipcRenderer?.on('show-feature-pending', (_event: unknown, label: string) => {
  showMessage({ type: MessageToastType.Info, message: `${label}功能暂未开放，敬请期待` });
});
window.ipcRenderer?.on('open-settle-page', (_event: unknown, title: string) => {
  window.ipcRenderer?.send('open-internal-url', {
    url: `${NIKO_CONFIG.h5WebBase}/os/#/settle`,
    title: title || '入驻申请',
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

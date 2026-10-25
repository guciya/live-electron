import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Loading from '../views/Loading.vue';
import Login from '../views/Login/Index.vue';
import { isMacPlatform } from '../TUILiveKit/utils/platform';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'loading',
    component: Loading,
  },
  {
    path: '/anchor-list',
    name: 'anchor-list',
    component: () => import(/* webpackChunkName: "AnchorList" */ '../views/AnchorList.vue')
  },
  {
    path: '/live-player',
    name: 'live-player',
    component: () => import(/* webpackChunkName: "LivePlayer" */ '../views/LivePlayer.vue')
  },
  {
    path: '/tui-live-kit-main',
    name: 'tui-live-kit-main',
    component: () => import(/* webpackChunkName: "TUILiveKitWin" */ '../views/TUILiveKitWin.vue')
  },
  {
    path: '/tui-livekit-mac',
    name: 'tui-livekit-mac',
    component: () => import(/* webpackChunkName: "TUILiveKitMac" */ '../views/TUILiveKitMac.vue')
  },
  {
    path: '/tui-live-kit-child',
    name: 'tui-live-kit-child',
    component: () => import(/* webpackChunkName: "TUILiveKitChild" */ '../views/TUILiveKitChild.vue'),
  },
  {
    path: '/tui-live-kit-cover',
    name: 'tui-live-kit-cover',
    component: () => import(/* webpackChunkName: "TUILiveKitCover" */ '../views/TUILiveKitCover.vue'),
  },
  {
    path: '/tui-live-kit-confirm',
    name: 'tui-live-kit-confirm',
    component: () => import(/* webpackChunkName: "TUILiveKitConfirm" */ '../views/TUILiveKitConfirm.vue'),
  },
  {
    // 透明礼物覆盖窗口：原生视频窗口永远在 DOM 之上，礼物特效必须放到同级透明窗口里播放
    path: '/gift-overlay',
    name: 'gift-overlay',
    component: () => import(/* webpackChunkName: "GiftOverlay" */ '../views/GiftOverlay.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

window.ipcRenderer.on('window-type', (event: any, type: string) => {
  console.log(`[router]on('window-type'):${type} current href:${window.location.href}`);
  // 主窗口登录成功后先进主播列表页，其余窗口类型仍进入各自页面
  const targetName = type === 'main' ? 'anchor-list' : `tui-live-kit-${type}`;
  if (router.currentRoute.value.name === targetName) {
    return;
  }
  router.replace({ name: targetName });
});

router.beforeEach((to) => {
  if (isMacPlatform() && to.name === 'tui-live-kit-main') {
    return { name: 'tui-livekit-mac' };
  }
  if (to.name === 'tui-live-kit-main' || to.name === 'anchor-list' || to.name === 'live-player') {
    let storedUserInfo: string | null = null;
    try {
      storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    } catch (e) {
      console.warn('[router] Failed to read localStorage:', e);
    }
    if (!storedUserInfo) {
      return { name: 'login' };
    }
  }
});

export default router;

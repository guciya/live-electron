<template>
  <div class="tui-loading" v-tui-loading="{ visible: true, background: 'transparent' }">
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { vTuiLoading } from '@tencentcloud/uikit-base-component-vue3';
import router from '../router';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';
import logger from '../TUILiveKit/utils/logger';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';

const logPrefix = '[Loading.vue]';

const gotoLogin = () => {
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  router.push('/login');
}

async function init(userInfo: Record<string, any>) {
  logger.log(`${logPrefix}init:`, userInfo);
  const isMain = await isMainWindow();
  if (isMain) {
    window.ipcRenderer.send('openTUILiveKit', {
      userInfo
    });
    router.push({ name: 'anchor-list' });
  }
}

onMounted(() => {
  // 礼物/用户卡片覆盖窗口：不参与登录态检查与跳转，直接落到自己的路由。
  // 否则 Loading 的登录跳转与主进程的 hash 设置形成时序竞争，
  // 覆盖窗口会停在登录页，导致礼物特效和用户卡片永远渲染不出来。
  if ((window as any).__WINDOW_ROLE__ === 'gift-overlay') {
    if (window.location.hash !== '#/gift-overlay') {
      window.location.hash = '/gift-overlay';
    }
    return;
  }
  const storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  let userInfo;
  if (!storedUserInfo) {
    // 未登录：直接跳转登录页，不再用 debug 配置生成测试用户（避免闪直播页）
    gotoLogin();
    return;
  } else {
    try {
      userInfo = JSON.parse(storedUserInfo);
    } catch (e) {
      logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
      gotoLogin();
      return;
    }
  }

  init(userInfo);
});
</script>

<style lang="scss" scoped>
.tui-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
}
</style>

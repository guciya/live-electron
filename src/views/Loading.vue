<template>
  <!-- 礼物覆盖窗口：透明背景、不显示 splash，直接落到路由 -->
  <div v-if="isGiftOverlay" class="tui-loading--overlay"></div>
  <NikoTransitionScene v-else variant="welcome" :fading-out="fadingOut" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import router from '../router';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';
import logger from '../TUILiveKit/utils/logger';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import NikoTransitionScene from '../niko/components/NikoTransitionScene.vue';

const logPrefix = '[Loading.vue]';

const isGiftOverlay = computed(() => (window as any).__WINDOW_ROLE__ === 'gift-overlay');
/** confirm / 其他工具窗口不参与登录跳转竞争，让 did-finish-load 的 hash 路由直接生效 */
const skipLoginGate = computed(() => {
  const role = (window as any).__WINDOW_ROLE__;
  return role === 'gift-overlay' || role === 'confirm';
});

/** 淡出过渡（splash 至少展示 MIN_SPLASH_MS，避免一闪而过） */
const fadingOut = ref(false);
const MIN_SPLASH_MS = 1500;
let _startTs = performance.now();

function gotoLogin() {
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  router.push('/login');
}

/** 确保 splash 至少展示 MIN_SPLASH_MS 后再跳转，防止闪屏 */
function ensureMinSplash(): Promise<void> {
  const elapsed = performance.now() - _startTs;
  const waitFor = Math.max(0, MIN_SPLASH_MS - elapsed);
  return new Promise((resolve) => window.setTimeout(resolve, waitFor));
}

async function init(userInfo: Record<string, any>) {
  logger.log(`${logPrefix}init:`, userInfo);
  const isMain = await isMainWindow();
  await ensureMinSplash();
  fadingOut.value = true;
  // 给淡出动画 300ms 生效时间
  window.setTimeout(() => {
    if (isMain) {
      window.ipcRenderer.send('openTUILiveKit', { userInfo });
      router.push({ name: 'anchor-list' });
    }
  }, 320);
}

onMounted(() => {
  _startTs = performance.now();

  // confirm / gift-overlay 等工具窗口：不参与登录态检查，
  // 等 main 进程 did-finish-load 里设置 hash 路由后自动生效
  if (skipLoginGate.value) {
    return;
  }

  const storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  let userInfo;
  if (!storedUserInfo) {
    void ensureMinSplash().then(() => {
      fadingOut.value = true;
      window.setTimeout(() => gotoLogin(), 320);
    });
    return;
  }
  try {
    userInfo = JSON.parse(storedUserInfo);
  } catch (e) {
    logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
    void ensureMinSplash().then(() => {
      fadingOut.value = true;
      window.setTimeout(() => gotoLogin(), 320);
    });
    return;
  }

  void init(userInfo);
});
</script>

<style lang="scss" scoped>
.tui-loading--overlay {
  width: 100vw;
  height: 100vh;
  background: transparent;
}
</style>

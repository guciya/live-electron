<template>
  <div class="gift-overlay-root">
    <!-- 原生视频窗口永远盖在 DOM 之上，礼物特效改在这个同级透明窗口里播放 -->
    <GiftEffect ref="giftEffectRef" standalone @idle="handleIdle" />
    <!-- 用户信息卡片同样会被原生视频压住，也在本窗口展示（展示期间主进程会关闭鼠标穿透） -->
    <UserInfoCard
      :visible="cardVisible"
      :info="cardInfo"
      :loading="cardLoading"
      @close="handleCardClose"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import UserInfoCard from '../niko/components/UserInfoCard.vue';
import type { LiveImGift } from '../niko/im/liveIm';
import type { AudienceCardInfo } from '../niko/api/live';

const giftEffectRef = ref<InstanceType<typeof GiftEffect> | null>(null);
const cardVisible = ref(false);
const cardLoading = ref(false);
const cardInfo = ref<AudienceCardInfo | null>(null);
let hideTimer: number | null = null;

const clearHideTimer = () => {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
};

/** 主窗口监听到礼物后经主进程转发到本窗口（gift-overlay-play -> gift-overlay-gift） */
const handleGift = (payload: { gift?: LiveImGift } | LiveImGift) => {
  const gift = (payload as any)?.gift || (payload as LiveImGift);
  if (!gift) {
    return;
  }
  clearHideTimer();
  (giftEffectRef.value as any)?.pushGift?.(gift);
};

/** 特效和横幅都播完后隐藏窗口，避免透明窗口长期压在视频上 */
const handleIdle = () => {
  // 用户卡片展示期间不能隐藏窗口
  if (cardVisible.value) {
    return;
  }
  clearHideTimer();
  hideTimer = window.setTimeout(() => {
    hideTimer = null;
    window.ipcRenderer?.send('gift-overlay-hide');
  }, 600);
};

/** 主窗口聊天室点击用户名后经主进程转发到本窗口展示卡片 */
const handleCardShow = (payload: { info?: AudienceCardInfo | null; loading?: boolean }) => {
  cardInfo.value = payload?.info || null;
  cardLoading.value = !!payload?.loading;
  cardVisible.value = true;
};

const handleCardClose = () => {
  cardVisible.value = false;
  window.ipcRenderer?.send('user-card-hide');
  // 卡片关闭后若没有礼物在播，顺手触发一次空闲隐藏
  handleIdle();
};

onMounted(() => {
  window.ipcRenderer?.on('gift-overlay-gift', handleGift);
  window.ipcRenderer?.on('user-card-show', handleCardShow);
});

onBeforeUnmount(() => {
  window.ipcRenderer?.off('gift-overlay-gift', handleGift);
  window.ipcRenderer?.off('user-card-show', handleCardShow);
  clearHideTimer();
});
</script>

<style>
/* 覆盖窗口本身必须完全透明 */
html,
body,
#app {
  background: transparent !important;
  background-color: transparent !important;
}
</style>

<style scoped>
.gift-overlay-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
}

/* 根容器是 pointer-events:none，卡片展示时需要恢复交互（主进程已同步关闭窗口鼠标穿透） */
.gift-overlay-root :deep(.niko-user-card-mask),
.gift-overlay-root :deep(.niko-user-card-mask *) {
  pointer-events: auto;
}
</style>

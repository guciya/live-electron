<template>
  <div class="gift-overlay-root">
    <!-- 原生视频窗口永远盖在 DOM 之上，礼物特效改在这个同级透明窗口里播放 -->
    <GiftEffect ref="giftEffectRef" standalone @idle="handleIdle" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import type { LiveImGift } from '../niko/im/liveIm';

const giftEffectRef = ref<InstanceType<typeof GiftEffect> | null>(null);
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
  clearHideTimer();
  hideTimer = window.setTimeout(() => {
    hideTimer = null;
    window.ipcRenderer?.send('gift-overlay-hide');
  }, 600);
};

onMounted(() => {
  window.ipcRenderer?.on('gift-overlay-gift', handleGift);
});

onBeforeUnmount(() => {
  window.ipcRenderer?.off('gift-overlay-gift', handleGift);
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
</style>

<template>
  <div ref="container" class="vap-gift-container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
// @ts-ignore video-animation-player 没有随包提供类型声明
import Vap from 'video-animation-player';
import { resolveImageUrl } from '../config';

const props = defineProps<{
  effectUrl: string;
  configUrl: string;
  nickname?: string;
  avatar?: string;
}>();

const emit = defineEmits<{
  (e: 'ended'): void;
  (e: 'error', error: unknown): void;
}>();

const container = ref<HTMLElement | null>(null);
let vapInstance: any = null;
let destroyed = false;

/**
 * 优先通过主进程请求配置 JSON：
 * 礼物资源域没有 CORS 头，渲染进程直接 fetch 会被浏览器拦截。
 */
async function loadConfig(url: string): Promise<any> {
  if (window.ipcRenderer?.invoke) {
    const text = await window.ipcRenderer.invoke('fetch-gift-config', url);
    return JSON.parse(String(text));
  }
  const response = await fetch(url);
  return response.json();
}

onMounted(async () => {
  const el = container.value;
  if (!el) {
    return;
  }
  try {
    const config = await loadConfig(props.configUrl);
    if (destroyed) {
      return;
    }
    const info = config?.info || {};
    vapInstance = new Vap({
      container: el,
      width: info.w,
      height: info.h,
      fps: info.fps,
      src: props.effectUrl,
      config,
      sources: {
        '[imgUser]': props.avatar
          ? { type: 'image', src: resolveImageUrl(props.avatar), width: 98, height: 98 }
          : null,
        '[textUser]': props.nickname
          ? { type: 'text', text: props.nickname, color: '#FFF1AE', style: 'bold' }
          : null,
      },
      loop: false,
      mute: true,
      precache: false,
      verbose: false,
      onEnd: () => {
        if (!destroyed) {
          emit('ended');
        }
      },
      onError: (error: unknown) => {
        if (!destroyed) {
          emit('error', error);
        }
      },
    });
    await vapInstance.play();
  } catch (error) {
    if (!destroyed) {
      emit('error', error);
    }
  }
});

onBeforeUnmount(() => {
  destroyed = true;
  if (vapInstance) {
    try {
      vapInstance.destroy();
    } catch (error) {
      console.warn('[VapGiftPlayer] destroy failed:', error);
    }
    vapInstance = null;
  }
});
</script>

<style scoped>
.vap-gift-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* VAP 运行时生成 canvas，scoped 选择器命中不到，需要 :deep 穿透 */
.vap-gift-container :deep(canvas) {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  /* 在保持比例的前提下尽量放大，并居中展示 */
  max-width: 92% !important;
  max-height: 92% !important;
  width: auto !important;
  height: auto !important;
  transform: translate(-50%, -50%) !important;
  animation: vap-gift-in 0.35s ease-out;
}

@keyframes vap-gift-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>

<template>
  <div class="niko-self-preview">
    <video ref="videoRef" class="niko-self-preview-video" autoplay muted playsinline></video>
    <div v-if="statusText" class="niko-self-preview-status">
      <span class="niko-self-preview-spinner"></span>
      <span>{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 开播后主播本地画面：拉自己的 CDN 流播放（观众视角，含美颜）。
 *
 * 为什么不用本地摄像头预览：
 * 本项目的 TRTC SDK 是 WASM room engine + 原生混流服务混合架构，
 * setLocalVideoRenderCallback / startLocalPreview 的帧回调底层抛
 * [AddLocalVideoRenderCallback] not support，JS 层拿不到本地采集帧；
 * getUserMedia 又因摄像头被混流服务（liteav_media_server.exe）独占而失败。
 * 唯一可行的 DOM 画面来源是云端转推出来的 CDN 流（flv.js MSE 播放）。
 *
 * 注意：
 * 1. 必须静音——主播麦克风正在推流，播放自己的声音会产生回声啸叫；
 * 2. CDN 转推有几秒延迟，画面比本地采集慢 2~6 秒属正常现象；
 * 3. 开播后 CDN 转推启动需要时间，这里轮询列表接口直到拿到自己的 play_url。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchRecommendLiveList } from '../api/live';
import { createStreamPlayer, type StreamPlayerHandle } from '../utils/flvPlayer';

const props = defineProps<{
  liveIndexId: string | number;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const statusText = ref('画面加载中…');

let player: StreamPlayerHandle | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollCount = 0;
let destroyed = false;
const MAX_POLL = 8; // 3s × 8 ≈ 24 秒，覆盖 CDN 转推启动延迟
const POLL_INTERVAL = 3000;

async function startPlay(playUrl: string) {
  const video = videoRef.value;
  if (!video || destroyed) {
    return;
  }
  player = await createStreamPlayer(video, playUrl, {
    muted: true,
    onError: (detail) => {
      console.warn('[NikoSelfPreview] play error:', detail);
      statusText.value = '画面加载失败，正在重试…';
      // 播放失败（转推还没就绪/签名过期等）：销毁后重新走轮询拿新地址
      player?.destroy();
      player = null;
      if (!destroyed) {
        pollCount = 0;
        schedulePoll();
      }
    },
  });
  statusText.value = '';
  console.log('[NikoSelfPreview] playing self stream');
}

/** 从在播列表里找自己的 play_url */
async function findSelfPlayUrl(): Promise<string> {
  const monitor = await fetchRecommendLiveList(1, 50, { force: true }).catch(() => null);
  const id = String(props.liveIndexId);
  const found = monitor?.list.find((item) => item.liveIndexId === id);
  return found?.playUrl || '';
}

function schedulePoll() {
  if (destroyed || pollTimer) {
    return;
  }
  pollTimer = setTimeout(async () => {
    pollTimer = null;
    if (destroyed) {
      return;
    }
    pollCount += 1;
    try {
      const playUrl = await findSelfPlayUrl();
      if (playUrl) {
        void startPlay(playUrl);
        return;
      }
    } catch (error: any) {
      console.warn('[NikoSelfPreview] fetch play url failed:', error?.message || error);
    }
    if (pollCount >= MAX_POLL) {
      statusText.value = '预览暂不可用，画面以手机端为准';
      return;
    }
    schedulePoll();
  }, POLL_INTERVAL);
}

onMounted(() => {
  schedulePoll();
});

watch(
  () => props.liveIndexId,
  (id, prev) => {
    if (id && id !== prev) {
      player?.destroy();
      player = null;
      pollCount = 0;
      statusText.value = '画面加载中…';
      schedulePoll();
    }
  },
);

onBeforeUnmount(() => {
  destroyed = true;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  player?.destroy();
  player = null;
});
</script>

<style scoped>
.niko-self-preview {
  position: absolute;
  inset: 0;
  background: #000;
}

.niko-self-preview-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.niko-self-preview-status {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  letter-spacing: 1px;
  pointer-events: none;
}

/* 加载转圈动画 */
.niko-self-preview-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.75);
  animation: niko-self-preview-spin 0.9s linear infinite;
}

@keyframes niko-self-preview-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

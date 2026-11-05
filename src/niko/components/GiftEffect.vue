<template>
  <div class="niko-gift-layer">
    <!-- 特效区：有特效资源时播放，否则只展示下方礼物横幅 -->
    <div
      v-for="item in activeEffects"
      :key="item.key"
      class="niko-gift-effect"
    >
      <VapGiftPlayer
        v-if="item.configUrl && !failedVapKeys.has(item.key)"
        :effect-url="item.mediaUrl"
        :config-url="item.configUrl"
        :nickname="item.nickname"
        :avatar="item.avatar"
        @ended="finish(item.key)"
        @error="handleVapError(item.key)"
      />
      <video
        v-else-if="item.videoUrl"
        class="niko-gift-effect-media"
        :src="item.videoUrl"
        autoplay
        muted
        playsinline
        @ended="finish(item.key)"
      />
      <img
        v-else-if="item.imageUrl"
        class="niko-gift-effect-media"
        :src="item.imageUrl"
        alt=""
      />
    </div>

    <!-- 礼物横幅：谁送了什么，按队列依次展示 -->
    <transition-group name="niko-gift-banner" tag="div" class="niko-gift-banners">
      <div v-for="item in banners" :key="item.key" class="niko-gift-banner">
        <span class="niko-gift-banner-icon">
          <img v-if="item.giftIcon" :src="item.giftIcon" alt="" />
          <span v-else class="niko-gift-banner-fallback">礼</span>
        </span>
        <span class="niko-gift-banner-text">
          <b>{{ item.nickname }}</b>
          <span class="niko-gift-banner-action">送出了</span>
          <b class="niko-gift-banner-name">{{ item.giftName }}</b>
          <span class="niko-gift-banner-count">x{{ item.giftCount }}</span>
        </span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onLiveImGift, type LiveImGift } from '../im/liveIm';
import VapGiftPlayer from './VapGiftPlayer.vue';

const props = withDefaults(defineProps<{
  /** 独立播放模式：不订阅 IM，由父组件通过 pushGift 推送礼物（透明覆盖窗口使用） */
  standalone?: boolean;
}>(), {
  standalone: false,
});

const emit = defineEmits<{
  (e: 'idle'): void;
}>();

interface GiftItem {
  key: string;
  nickname: string;
  giftName: string;
  giftCount: number;
  giftIcon: string;
  avatar: string;
  mediaUrl: string;
  /** VAP 配置地址，有值时用透明动画播放（与 H5 NikoGiftEffect 一致） */
  configUrl: string;
  videoUrl: string;
  imageUrl: string;
}

const BANNER_DURATION_MS = 4000;
// 与 H5 NikoGiftEffect 一致：新礼物直接顶掉正在播放的动画
const MAX_EFFECTS = 1;

const banners = ref<GiftItem[]>([]);
const activeEffects = ref<GiftItem[]>([]);
/** VAP 初始化/播放失败的礼物，回退为直接播放媒体 */
const failedVapKeys = ref<Set<string>>(new Set());
const timers = new Set<number>();
let unsubscribe: (() => void) | null = null;

const isVideoUrl = (url: string) => /\.(mp4|webm|m3u8)(\?|$)/i.test(url);

function schedule(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    callback();
  }, delay);
  timers.add(timer);
}

function finish(key: string) {
  activeEffects.value = activeEffects.value.filter((item) => item.key !== key);
  banners.value = banners.value.filter((item) => item.key !== key);
}

/** VAP 播放失败时回退到直接播放 mp4/img，避免礼物完全没动静（与 H5 一致） */
function handleVapError(key: string) {
  failedVapKeys.value.add(key);
}

function push(gift: LiveImGift) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mediaUrl = gift.effectUrl || '';
  const configUrl = gift.configUrl || '';
  const item: GiftItem = {
    key,
    nickname: gift.nickname,
    giftName: gift.giftName,
    giftCount: gift.giftCount,
    giftIcon: gift.giftIcon,
    avatar: gift.avatar,
    mediaUrl,
    configUrl,
    videoUrl: isVideoUrl(mediaUrl) ? mediaUrl : '',
    imageUrl: mediaUrl && !isVideoUrl(mediaUrl) ? mediaUrl : '',
  };

  banners.value = [...banners.value.slice(-2), item];

  if (mediaUrl) {
    if (activeEffects.value.length >= MAX_EFFECTS) {
      activeEffects.value = activeEffects.value.slice(1);
    }
    activeEffects.value = [...activeEffects.value, item];
    // VAP 走 onEnd，直接播放视频走 ended；无结束事件的图片按兜底时长移除
    schedule(() => finish(key), configUrl ? 15000 : BANNER_DURATION_MS + 2000);
  }

  // 横幅单独按时长移除，不打断正在播放的礼物动画
  schedule(() => {
    banners.value = banners.value.filter((banner) => banner.key !== key);
  }, BANNER_DURATION_MS);
}

onMounted(() => {
  // 覆盖窗口里没有 IM 连接，礼物由主窗口经主进程转发进来
  if (!props.standalone) {
    unsubscribe = onLiveImGift(push);
  }
});

// 独立播放模式下，特效与横幅都结束后通知覆盖窗口隐藏
watch(
  () => activeEffects.value.length + banners.value.length,
  (total) => {
    if (props.standalone && total === 0) {
      emit('idle');
    }
  },
);

defineExpose({ pushGift: push });

onBeforeUnmount(() => {
  unsubscribe?.();
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.clear();
});
</script>

<style scoped>
.niko-gift-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 20;
}

.niko-gift-effect {
  position: absolute;
  inset: -6%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: niko-gift-effect-in 0.35s ease-out;
}

/* 电脑端主窗口（主播开播页 / 观众观看页）视频区通常在 900~1600px 宽，
   礼物特效需要放大到接近铺满整个视频区，避免 VAP 透明动画缩在画面中心一小撮 */
.niko-gift-effect-media {
  width: 104%;
  height: 104%;
  max-width: 104%;
  max-height: 104%;
  object-fit: contain;
  object-position: center;
  /* VAP/透明视频常以黑底渲染，screen 混合让黑底融入画面 */
  mix-blend-mode: screen;
  filter: drop-shadow(0 10px 36px rgba(0, 0, 0, 0.45));
}

/* 超宽屏（2K/4K 显示器，主播开播页视频区宽度 > 1400px）进一步放大 */
@media (min-width: 1600px) {
  .niko-gift-effect {
    inset: -10%;
  }
  .niko-gift-effect-media {
    width: 110%;
    height: 110%;
    max-width: 110%;
    max-height: 110%;
  }
}

@keyframes niko-gift-effect-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 横幅字号随视口自适应：保证 1366~2560 宽度下都清晰醒目 */
.niko-gift-banners {
  position: absolute;
  left: 1.2vw;
  bottom: 1.6vh;
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
  max-width: 58%;
}

.niko-gift-banner {
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.7vw, 14px);
  padding: clamp(5px, 0.4vh, 10px) clamp(12px, 1.1vw, 22px) clamp(5px, 0.4vh, 10px) clamp(4px, 0.35vw, 8px);
  border-radius: clamp(18px, 2vw, 30px);
  background: linear-gradient(90deg, rgba(255, 136, 61, 0.78), rgba(255, 72, 72, 0.72));
  box-shadow: 0 10px 24px rgba(255, 92, 48, 0.22);
  color: #fff;
  font-size: clamp(13px, 1.05vw, 18px);
  white-space: nowrap;
}

.niko-gift-banner-icon {
  flex: 0 0 auto;
  width: clamp(26px, 2vw, 40px);
  height: clamp(26px, 2vw, 40px);
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.24);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.niko-gift-banner-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.niko-gift-banner-fallback {
  font-size: clamp(12px, 0.85vw, 15px);
  font-weight: 600;
}

.niko-gift-banner-text {
  display: inline-flex;
  align-items: center;
  gap: clamp(2px, 0.25vw, 6px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.niko-gift-banner-action {
  color: rgba(255, 255, 255, 0.82);
}

.niko-gift-banner-name {
  color: #ffe9a8;
}

.niko-gift-banner-count {
  color: #fff3d6;
  font-weight: 700;
  font-size: 1.15em;
}

.niko-gift-banner-enter-active,
.niko-gift-banner-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.niko-gift-banner-enter-from,
.niko-gift-banner-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}
</style>

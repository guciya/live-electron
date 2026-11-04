<template>
  <div
    v-if="visible"
    ref="rootEl"
    class="live-marquee"
    :style="{ '--marquee-travel': travel }"
    aria-hidden="true"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="live-marquee-item"
      :class="`is-${item.type}`"
      :style="{ top: `${item.top}px`, animationDuration: `${item.duration}s` }"
      @animationend="removeItem(item.id)"
    >
      <img v-if="item.icon" class="live-marquee-icon" :src="item.icon" alt="" />
      <span class="live-marquee-name">{{ item.nickname }}</span>
      <span class="live-marquee-text">{{ item.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onLiveImMessage, type LiveImMessage } from '../im/liveIm';

interface MarqueeItem {
  id: string;
  text: string;
  nickname: string;
  type: 'banner' | 'gift' | 'join';
  icon: string;
  top: number;
  duration: number;
}

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true });

const items = ref<MarqueeItem[]>([]);
const rootEl = ref<HTMLDivElement | null>(null);
const travel = ref('100vw');
const seenIds = new Set<string>();
let unsubscribe: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let lastKey = '';
let lastKeyAt = 0;

/** 以飘屏容器（.player-stage / 直播画面区）宽度计算滚动距离，保证从画面右侧进入 */
function measureTravel() {
  const width = rootEl.value?.clientWidth || 0;
  travel.value = width ? `${width + 320}px` : '100vw';
}

function pickTop(): number {
  const lane = Math.floor(Math.random() * 5);
  return 64 + lane * 44;
}

function removeItem(id: string) {
  const index = items.value.findIndex((item) => item.id === id);
  if (index > -1) items.value.splice(index, 1);
}

function handleMessage(message: LiveImMessage) {
  if (!props.visible) return;
  if (seenIds.has(message.id)) return;

  const dedupeKey = `${message.nickname}-${message.text}`;
  const now = Date.now();
  if (dedupeKey === lastKey && now - lastKeyAt < 2500) {
    return;
  }
  lastKey = dedupeKey;
  lastKeyAt = now;

  let type: MarqueeItem['type'] = 'banner';
  let text = message.text;
  let icon = '';

  if (message.kind === 'gift' && message.gift) {
    type = 'gift';
    text = `送出了 ${message.gift.giftName} × ${message.gift.giftCount}`;
    icon = message.gift.giftIcon;
  } else if (message.kind === 'join') {
    type = 'join';
    text = '进入了直播间';
  } else if (!message.marquee) {
    // 普通聊天交给聊天面板展示，不参与飘屏
    return;
  }

  seenIds.add(message.id);
  if (seenIds.size > 200) seenIds.clear();

  items.value.push({
    id: `${message.id}-${Date.now()}`,
    text,
    nickname: message.nickname || '系统',
    type,
    icon,
    top: pickTop(),
    duration: 12 + Math.random() * 4,
  });
  if (items.value.length > 16) {
    items.value.splice(0, items.value.length - 16);
  }
}

onMounted(() => {
  measureTravel();
  if (rootEl.value) {
    resizeObserver = new ResizeObserver(measureTravel);
    resizeObserver.observe(rootEl.value);
  }
  unsubscribe = onLiveImMessage(handleMessage);
});

onBeforeUnmount(() => {
  unsubscribe?.();
  unsubscribe = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  items.value = [];
  seenIds.clear();
});

watch(
  () => props.visible,
  (next) => {
    if (!next) items.value = [];
  },
);
</script>

<style lang="scss" scoped>
.live-marquee {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 6;
}

.live-marquee-item {
  position: absolute;
  left: 100%;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  line-height: 1.2;
  white-space: nowrap;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(12, 16, 28, 0.62);
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  animation-name: live-marquee-scroll;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  opacity: 0.92;

  &.is-banner {
    border-color: rgba(110, 231, 255, 0.45);
    box-shadow: 0 0 16px rgba(80, 210, 255, 0.28);
  }

  &.is-gift {
    border-color: rgba(255, 122, 196, 0.5);
    box-shadow: 0 0 16px rgba(255, 90, 180, 0.3);
  }

  &.is-join {
    border-color: rgba(140, 190, 255, 0.4);
    box-shadow: 0 0 14px rgba(90, 150, 255, 0.22);
  }
}

.live-marquee-name {
  font-weight: 600;
  color: #9ef0ff;
}

.is-gift .live-marquee-name {
  color: #ffb3e0;
}

.is-join .live-marquee-name {
  color: #b9d4ff;
}

.live-marquee-text {
  color: rgba(255, 255, 255, 0.86);
}

.live-marquee-icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
}

@keyframes live-marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-1 * var(--marquee-travel, 100vw)));
  }
}
</style>

<template>
  <div v-if="visible" class="more-live-mask" @click="emit('close')">
    <div class="more-live-tray" @click.stop>
      <ModalThreeScene variant="live" />
      <div class="more-live-head">
        <span class="more-live-head-title">正在直播（{{ list.length }}）</span>
        <button class="more-live-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
      </div>

      <div ref="scrollEl" class="more-live-scroll">
        <div v-if="loading" class="more-live-hint">加载中...</div>
        <template v-else>
          <button
            v-for="item in list"
            :key="item.liveIndexId"
            class="more-live-card"
            :class="{ 'is-current': item.liveIndexId === currentLiveIndexId }"
            type="button"
            @click="emit('select', item)"
          >
            <div class="more-live-cover">
              <video
                v-if="item.playUrl"
                :ref="(el) => setVideoRef(item.liveIndexId, el)"
                :data-live-id="item.liveIndexId"
                class="more-live-video"
                muted
                autoplay
                playsinline
              />
              <img
                v-else-if="item.avatar"
                class="more-live-cover-img"
                :src="resolveImageUrl(item.avatar)"
                alt=""
              />
              <span v-else class="more-live-cover-empty">{{ (item.nickname || 'N').slice(0, 1).toUpperCase() }}</span>

              <span class="more-live-viewers">{{ item.viewerCount }} 人</span>
              <span v-if="item.liveIndexId === currentLiveIndexId" class="more-live-current">当前</span>
            </div>

            <div class="more-live-meta">
              <img
                v-if="item.avatar"
                class="more-live-avatar"
                :src="resolveImageUrl(item.avatar)"
                alt=""
              />
              <span v-else class="more-live-avatar more-live-avatar-empty">
                {{ (item.nickname || 'N').slice(0, 1).toUpperCase() }}
              </span>
              <div class="more-live-text">
                <span class="more-live-name">{{ item.nickname || '主播' }}</span>
                <span class="more-live-title">{{ item.title || '直播中' }}</span>
              </div>
            </div>
          </button>

          <div v-if="!list.length" class="more-live-hint">暂无正在直播的主播</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { resolveImageUrl } from '../config';
import { fetchRecommendLiveList } from '../api/live';
import type { NikoLiveListItem } from '../api/liveList';
import { createStreamPlayer, type StreamPlayerHandle } from '../utils/flvPlayer';
import ModalThreeScene from './ModalThreeScene.vue';

/** 与主播列表页同一个接口，一次拉 200 条 */
const PAGE_SIZE = 200;

const props = defineProps<{
  visible: boolean;
  currentLiveIndexId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', item: NikoLiveListItem): void;
}>();

const list = ref<NikoLiveListItem[]>([]);
const loading = ref(false);
const scrollEl = ref<HTMLDivElement | null>(null);

const videoEls = new Map<string, HTMLVideoElement>();
const previewHandles = new Map<string, StreamPlayerHandle>();

/** 只给横向可视区域内的卡片拉流，避免同时拉几十路预览 */
let previewObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (previewObserver || typeof IntersectionObserver === 'undefined') {
    return previewObserver;
  }
  previewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const videoEl = entry.target as HTMLVideoElement;
        const id = videoEl.dataset.liveId || '';
        if (!id) {
          return;
        }
        if (entry.isIntersecting) {
          void startPreview(id);
        } else {
          stopPreview(id);
        }
      });
    },
    { root: scrollEl.value, rootMargin: '120px' },
  );
  return previewObserver;
}

function stopPreview(id: string) {
  const handle = previewHandles.get(id);
  if (handle) {
    handle.destroy();
    previewHandles.delete(id);
  }
}

async function startPreview(id: string) {
  if (previewHandles.has(id)) {
    return;
  }
  const el = videoEls.get(id);
  if (!el) {
    return;
  }
  const item = list.value.find((entry) => entry.liveIndexId === id);
  if (!item?.playUrl) {
    return;
  }
  try {
    const handle = await createStreamPlayer(el, item.playUrl, {
      muted: true,
      onError: (detail) => console.warn('[MoreLiveTray] preview failed:', id, detail),
    });
    // 元素被替换或面板已关闭时立即回收
    if (videoEls.get(id) !== el) {
      handle.destroy();
      return;
    }
    previewHandles.set(id, handle);
  } catch (error) {
    console.warn('[MoreLiveTray] preview error:', id, error);
  }
}

function setVideoRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLVideoElement) {
    videoEls.set(id, el);
    getObserver()?.observe(el);
    return;
  }
  videoEls.delete(id);
  stopPreview(id);
}

function stopAllPreviews() {
  previewHandles.forEach((handle) => handle.destroy());
  previewHandles.clear();
  if (previewObserver) {
    previewObserver.disconnect();
    previewObserver = null;
  }
  videoEls.clear();
}

async function loadList() {
  loading.value = true;
  try {
    const result = await fetchRecommendLiveList(1, PAGE_SIZE, { force: true });
    list.value = result.list;
  } catch (error: any) {
    console.warn('[MoreLiveTray] load live list failed:', error?.message || error);
    list.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void loadList();
    } else {
      stopAllPreviews();
    }
  },
  { immediate: true },
);

onUnmounted(stopAllPreviews);
</script>

<style lang="scss" scoped>
.more-live-mask {
  position: absolute;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 1.25rem;
  background: rgba(0, 0, 0, 0.45);
}

/* 长条弹窗：横向铺开，内部横向滚动 */
.more-live-tray {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 92%;
  max-width: 62rem;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(ellipse at 72% 50%, rgba(255, 74, 143, 0.11), transparent 42%),
    linear-gradient(100deg, rgba(19, 20, 31, 0.98), rgba(24, 18, 31, 0.97));
  border: 1px solid rgba(255, 132, 180, 0.14);
  border-radius: 0.75rem;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 2rem rgba(255, 74, 143, 0.05);
}

.more-live-tray > :not(.modal-three-scene) {
  position: relative;
  z-index: 1;
}

.more-live-head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem 0.375rem;
}

.more-live-head-title {
  font-size: 0.8125rem;
  font-weight: 600;
}

.more-live-close {
  padding: 0;
  font-size: 0.8125rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  background: none;
  border: none;

  &:hover {
    color: #fff;
  }
}

.more-live-scroll {
  display: flex;
  flex: none;
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.18);
    border-radius: 3px;
  }
}

.more-live-card {
  flex: none;
  width: 10.5rem;
  padding: 0;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  background-color: #17171b;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.28);
    transform: translateY(-2px);
  }

  &.is-current {
    border-color: #ff6a9c;
  }
}

.more-live-cover {
  position: relative;
  width: 100%;
  height: 6rem;
  overflow: hidden;
  background-color: #0d0d10;
}

.more-live-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-live-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-live-cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
}

.more-live-viewers {
  position: absolute;
  left: 0.375rem;
  bottom: 0.3125rem;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  line-height: 0.875rem;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.55);
  border-radius: 0.25rem;
}

.more-live-current {
  position: absolute;
  top: 0.3125rem;
  right: 0.3125rem;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  line-height: 0.875rem;
  color: #fff;
  background-color: #ff3d71;
  border-radius: 0.25rem;
}

.more-live-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem;
}

.more-live-avatar {
  flex: none;
  width: 1.375rem;
  height: 1.375rem;
  object-fit: cover;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.15);
}

.more-live-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
}

.more-live-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.more-live-name {
  font-size: 0.6875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-live-title {
  font-size: 0.5625rem;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-live-hint {
  padding: 1.5rem 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}
</style>

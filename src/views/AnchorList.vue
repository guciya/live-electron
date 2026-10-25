<template>
  <UIKitProvider theme="dark">
    <div class="anchor-list-page">
      <header class="anchor-header tui-window-header">
        <div class="anchor-header-left">
          <img class="logo-icon" src="../assets/niko-logo.png" alt="Niko直播" />
          <span class="logo-title">Niko直播</span>
        </div>

        <div class="anchor-header-right">
          <div v-if="userInfo" class="anchor-user">
            <img
              v-if="userAvatar"
              class="anchor-user-avatar"
              :src="userAvatar"
              alt=""
              @error="onUserAvatarError"
            />
            <span v-else class="anchor-user-avatar anchor-user-avatar-empty">{{ userInitial }}</span>
            <span class="anchor-user-name">{{ userInfo.nickname || userInfo.userShowId }}</span>
          </div>
          <button class="anchor-text-btn" type="button" @click="handleLogout">退出登录</button>
          <button class="anchor-start-live-btn" type="button" @click="handleStartLive">
            <IconLiveStart class="start-live-icon" />
            <span>去开播</span>
          </button>
          <div class="window-tool">
            <button class="window-tool-btn" type="button" @click="onMinimize">
              <svg-icon :icon="MinimizeIcon"></svg-icon>
            </button>
            <button class="window-tool-btn" type="button" @click="onToggleMaximize">
              <svg-icon v-if="!isMaximized" :icon="MaximizeIcon"></svg-icon>
              <svg-icon v-else :icon="MiniIcon"></svg-icon>
            </button>
            <button class="window-tool-btn" type="button" @click="onClose">
              <svg-icon :icon="CloseIcon"></svg-icon>
            </button>
          </div>
        </div>
      </header>

      <main class="anchor-body">
        <div class="anchor-body-title">
          <div class="title-left">
            <span class="title-text">主播列表</span>
            <span class="title-count">{{ total }} 位主播正在直播</span>
          </div>
          <button
            class="refresh-btn"
            :class="{ 'is-loading': loading }"
            type="button"
            aria-label="刷新"
            @click="handleRefresh"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>

        <div v-if="apiError" class="anchor-error">
          <p>主播列表加载失败：{{ apiError }}</p>
          <button class="anchor-retry-btn" type="button" :disabled="loading" @click="handleRefresh">重试</button>
        </div>
        <div v-else-if="loading" class="anchor-hint">加载中...</div>
        <div v-else-if="!liveList.length" class="anchor-empty">
          <IconLive class="anchor-empty-icon" />
          <p class="anchor-empty-text">暂无主播正在直播</p>
          <button class="anchor-start-live-btn anchor-empty-start" type="button" @click="handleStartLive">
            <IconLiveStart class="start-live-icon" />
            <span>去开播</span>
          </button>
        </div>

        <div v-else class="anchor-grid">
          <div
            v-for="item in liveList"
            :key="item.liveIndexId"
            class="anchor-card"
            @click="handleCardClick(item)"
          >
            <div class="card-cover">
              <video
                v-if="item.playUrl"
                :ref="(el) => setVideoRef(item.liveIndexId, el)"
                :data-live-id="item.liveIndexId"
                class="card-video"
                muted
                autoplay
                playsinline
              />
              <img v-else-if="item.cover" class="card-cover-img" :src="resolveImageUrl(item.cover)" alt="" />
              <div v-else class="card-cover-empty">
                <IconLive />
              </div>
              <div class="card-viewer-count">{{ item.viewerCount }} 人观看</div>
              <div class="card-enter-tip">进入直播间</div>
            </div>
            <div class="card-info">
              <img
                v-if="item.avatar"
                class="card-avatar"
                :src="resolveImageUrl(item.avatar)"
                alt=""
                @error="onCardAvatarError"
              />
              <div v-else class="card-avatar card-avatar-empty" />
              <div class="card-text">
                <div class="card-title">{{ item.title || '直播中' }}</div>
                <div class="card-subtitle">
                  <span class="card-nickname">{{ item.nickname || '主播' }}</span>
                  <span v-if="item.isCharge === 1" class="card-charge">付费</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComponentPublicInstance, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { IconLive, IconLiveStart, UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';
import SvgIcon from '../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../TUILiveKit/common/icons/CloseIcon.vue';
import { isMacPlatform } from '../TUILiveKit/utils/platform';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { resolveImageUrl } from '../niko/config';
import { fetchLiveFocusMonitorList, fetchLiveMonitorList, type NikoLiveListItem } from '../niko/api/liveList';
import { createStreamPlayer, type StreamPlayerHandle } from '../niko/utils/flvPlayer';
import { useAuthStore } from '../niko/store/auth';

const router = useRouter();
const authStore = useAuthStore();
const { logout: logoutIm } = useLoginState();

const liveList = ref<NikoLiveListItem[]>([]);
const total = ref(0);
const loading = ref(true);
const apiError = ref('');
const userInfo = computed(() => authStore.userInfo);
const userAvatarError = ref(false);
const userAvatar = computed(() => {
  if (userAvatarError.value || !userInfo.value?.avatar) {
    return '';
  }
  return resolveImageUrl(userInfo.value.avatar);
});
const userInitial = computed(() => (userInfo.value?.nickname || userInfo.value?.userShowId || 'N').slice(0, 1).toUpperCase());

/**
 * 合并两个 CMS 列表（liveMonitorList + liveFocusMonitorList）。
 * 同一场直播在两边都可能返回，按 liveIndexId 去重，保留先出现的项。
 */
function mergeLiveList(main: NikoLiveListItem[], focus: NikoLiveListItem[]): NikoLiveListItem[] {
  const seen = new Set<string>();
  const merged: NikoLiveListItem[] = [];
  [...main, ...focus].forEach((item) => {
    if (!item.liveIndexId || seen.has(item.liveIndexId)) {
      return;
    }
    seen.add(item.liveIndexId);
    merged.push(item);
  });
  return merged;
}

/**
 * 加载主播列表。
 * 页面首次进入只请求一次；点击刷新按钮传 force=true 强制重新请求。
 */
async function loadList(force = false) {
  loading.value = true;
  apiError.value = '';
  try {
    // 同时拉取「在播主播」和「关注主播」两个 CMS 列表，按 liveIndexId 去重后合并展示
    const [mainResult, focusResult] = await Promise.allSettled([
      fetchLiveMonitorList(1, 20, { force }),
      fetchLiveFocusMonitorList(1, 20, { force }),
    ]);
    if (mainResult.status === 'rejected' && focusResult.status === 'rejected') {
      throw mainResult.reason;
    }
    if (mainResult.status === 'rejected') {
      console.warn('[AnchorList] fetchLiveMonitorList failed:', mainResult.reason);
    }
    if (focusResult.status === 'rejected') {
      console.warn('[AnchorList] fetchLiveFocusMonitorList failed:', focusResult.reason);
    }
    const merged = mergeLiveList(
      mainResult.status === 'fulfilled' ? mainResult.value.list : [],
      focusResult.status === 'fulfilled' ? focusResult.value.list : [],
    );
    liveList.value = merged;
    total.value = merged.length;
    // 刷新后下播的主播不再保留预览播放器
    const validIds = new Set(merged.map((item) => item.liveIndexId));
    previewHandles.forEach((_handle, id) => {
      if (!validIds.has(id)) {
        stopPreview(id);
      }
    });
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : String(error);
    liveList.value = [];
    total.value = 0;
    console.error('[AnchorList] fetchLiveMonitorList failed:', error);
  } finally {
    loading.value = false;
  }
}

function handleRefresh() {
  void loadList(true);
}

/* ---------------- 卡片直播画面预览 ---------------- */
const videoEls = new Map<string, HTMLVideoElement>();
const previewHandles = new Map<string, StreamPlayerHandle>();

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
  const item = liveList.value.find((entry) => entry.liveIndexId === id);
  if (!item?.playUrl) {
    return;
  }
  try {
    const handle = await createStreamPlayer(el, item.playUrl, {
      muted: true,
      onError: (detail) => console.warn('[AnchorList] preview failed:', id, detail),
    });
    // 组件已卸载 / 元素被替换时立即回收，避免泄漏
    if (videoEls.get(id) !== el) {
      handle.destroy();
      return;
    }
    previewHandles.set(id, handle);
  } catch (error) {
    console.warn('[AnchorList] preview error:', id, error);
  }
}

function setVideoRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLVideoElement) {
    videoEls.set(id, el);
    previewObserver?.observe(el);
    return;
  }
  videoEls.delete(id);
  stopPreview(id);
}

// 只播放进入可视区域的卡片，避免同时拉多路流
const previewObserver: IntersectionObserver | null = typeof IntersectionObserver === 'undefined'
  ? null
  : new IntersectionObserver(
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
    { rootMargin: '200px' },
  );

function handleCardClick(item: NikoLiveListItem) {
  if (!item.liveIndexId) {
    return;
  }
  router.push({
    name: 'live-player',
    query: {
      liveId: item.liveIndexId,
      roomId: item.roomId,
      liveTitle: item.title,
      anchorName: item.nickname,
      avatar: item.avatar,
      viewerCount: String(item.viewerCount),
    },
    // play_url 带 txSecret/txTime 签名，放 query 会被二次编码破坏签名，因此用 history.state 传递
    state: { playUrl: item.playUrl },
  });
}

function handleStartLive() {
  router.push({ name: isMacPlatform() ? 'tui-livekit-mac' : 'tui-live-kit-main' });
}

async function handleLogout() {
  // 退出登录时同步登出 IM，避免切换账号后直播间复用旧账号会话导致互踢
  try {
    await logoutIm();
  } catch (error) {
    console.warn('[AnchorList] IM logout failed:', error);
  }
  authStore.logout();
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  window.ipcRenderer.send('user-logout');
  router.replace({ name: 'login' });
}

function onUserAvatarError() {
  userAvatarError.value = true;
}

function onCardAvatarError(event: Event) {
  const target = event.target as HTMLImageElement | null;
  if (target) {
    target.style.visibility = 'hidden';
  }
}

/* ---------------- 窗口控制 ---------------- */
const isMaximized: Ref<boolean> = ref(false);

function onMinimize() {
  window.ipcRenderer.send('on-minimize-window', null);
}

function onToggleMaximize() {
  isMaximized.value = !isMaximized.value;
  window.ipcRenderer.send('on-maximize-window', isMaximized.value);
}

function onClose() {
  window.ipcRenderer.send('on-close-window', null);
}

onMounted(() => {
  void loadList();
});

onBeforeUnmount(() => {
  previewObserver?.disconnect();
  previewHandles.forEach((handle) => handle.destroy());
  previewHandles.clear();
  videoEls.clear();
});
</script>

<style lang="scss" scoped>
.anchor-list-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  color: var(--text-color-primary, #ffffff);
  background-color: var(--bg-color-topbar, #141518);
  box-sizing: border-box;
}

.anchor-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2.75rem;
  padding: 0 1rem;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background-color: var(--bg-color-topbar, #141518);
  cursor: move;

  .anchor-header-left {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;

    .logo-icon {
      width: 1.625rem;
      height: 1.5rem;
      object-fit: contain;
    }

    .logo-title {
      padding-left: 0.6rem;
      font-size: 1.125rem;
      font-weight: bold;
    }
  }

  .anchor-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    -webkit-app-region: no-drag;
  }

  .anchor-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;

    .anchor-user-avatar {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      object-fit: cover;
      background-color: rgba(255, 255, 255, 0.12);
    }

    .anchor-user-avatar-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;
    }

    .anchor-user-name {
      max-width: 8rem;
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .anchor-text-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 0.25rem;

    &:hover {
      color: var(--text-color-primary, #ffffff);
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .anchor-start-live-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 1.875rem;
    padding: 0 0.875rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    background-color: var(--button-color-primary-default, #1c66e5);
    border: none;
    border-radius: 0.375rem;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.9;
    }

    .start-live-icon {
      width: 1rem;
      height: 1rem;
    }
  }

  .window-tool {
    display: flex;
    align-items: center;
    align-self: flex-end;
    height: 2.75rem;
    -webkit-app-region: no-drag;

    .window-tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      margin: 0;
      color: var(--text-color-primary, #ffffff);
      cursor: pointer;
      background: transparent;
      border: none;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      &:active {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }
}

.anchor-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
  box-sizing: border-box;
  gap: 0.75rem;
}

.anchor-body-title {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title-left {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .title-text {
    font-size: 1rem;
    font-weight: 600;
  }

  .title-count {
    font-size: 0.75rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
    cursor: pointer;
    background: transparent;
    border: none;

    &:hover {
      color: var(--text-color-primary, #ffffff);
    }

    &.is-loading {
      cursor: default;

      svg {
        animation: anchor-refresh-spin 0.9s linear infinite;
      }
    }
  }
}

@keyframes anchor-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.anchor-hint {
  padding: 3rem 0;
  font-size: 0.875rem;
  text-align: center;
  color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
}

.anchor-error {
  width: calc(100% - 2rem);
  margin: 1.5rem 1rem 0;
  padding: 1rem 1.25rem;
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.25);
  border-radius: 0.5rem;

  p {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    color: #dc3545;
    word-break: break-all;
  }

  .anchor-retry-btn {
    height: 1.875rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    color: #fff;
    cursor: pointer;
    background-color: #dc3545;
    border: none;
    border-radius: 0.25rem;

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
}

.anchor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 12rem;

  .anchor-empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(255, 255, 255, 0.28);
  }

  .anchor-empty-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  }

  .anchor-empty-start {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.125rem;
    padding: 0 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    background-color: var(--button-color-primary-default, #1c66e5);
    border: none;
    border-radius: 0.375rem;

    .start-live-icon {
      width: 1rem;
      height: 1rem;
    }
  }
}

.anchor-grid {
  width: 100%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.anchor-card {
  overflow: hidden;
  cursor: pointer;
  border-radius: 0.5rem;
  background-color: var(--bg-color-operate, #17181a);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);

    .card-enter-tip {
      opacity: 1;
    }
  }

  .card-cover {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    overflow: hidden;
    background-color: #000;

    .card-cover-img,
    .card-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-enter-tip {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fff;
    opacity: 0;
    background-color: rgba(0, 0, 0, 0.35);
    transition: opacity 0.2s ease;
  }

  .card-cover-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(135deg, #3a3a4d 0%, #1f2028 100%);
  }

  .card-viewer-count {
    position: absolute;
    left: 8px;
    bottom: 8px;
    padding: 2px 8px;
    font-size: 11px;
    line-height: 16px;
    color: #fff;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.45);
  }

  .card-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
  }

  .card-avatar {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.12);
  }

  .card-avatar-empty {
    display: block;
  }

  .card-text {
    min-width: 0;
  }

  .card-title {
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-subtitle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  }

  .card-nickname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-charge {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    line-height: 15px;
    color: #fff;
    border-radius: 2px;
    background-color: var(--button-color-primary-default, #1c66e5);
  }
}
</style>

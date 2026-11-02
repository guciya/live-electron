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
            <span class="anchor-user-avatar-ring">
              <img
                v-if="userAvatar"
                class="anchor-user-avatar"
                :src="userAvatar"
                alt=""
                @error="onUserAvatarError"
              />
              <span v-else class="anchor-user-avatar anchor-user-avatar-empty">{{ userInitial }}</span>
            </span>
            <span class="anchor-user-name anchor-user-name-shine">{{ userInfo.nickname || userInfo.userShowId }}</span>
          </div>
          <!-- 业务入口：主播中心 打开主播中心页；公会|家族 打开组织页；提现 暂未开放；家族入驻 / 公会入驻 软件内打开入驻页 -->
          <button class="anchor-text-btn" type="button" @click="goAnchorCenter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
              <circle cx="12" cy="16" r="2" />
            </svg>
            <span>主播中心</span>
          </button>
          <button class="anchor-text-btn" type="button" @click="openOrganizationPage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>公会|家族</span>
          </button>
          <button class="anchor-text-btn" type="button" @click="openWithdrawPage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 15h4" />
            </svg>
            <span>提现</span>
          </button>
          <button class="anchor-text-btn" type="button" @click="openSettlePage('family')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M10 21v-6h4v6" />
            </svg>
            <span>家族入驻</span>
          </button>
          <button class="anchor-text-btn" type="button" @click="openSettlePage('guild')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="3" width="16" height="18" rx="1" />
              <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
              <path d="M10 21v-3h4v3" />
            </svg>
            <span>公会入驻</span>
          </button>
          <button class="anchor-start-live-btn" type="button" @click="handleOpenFollowList">
            <svg class="start-live-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9.5" cy="7.5" r="3.5" />
              <path d="M3 20c0-3.2 2.9-5.5 6.5-5.5 1.9 0 3.6.7 4.6 1.8" />
              <path d="M18 10v6M15 13h6" />
            </svg>
            <span>关注列表</span>
          </button>
          <button class="anchor-start-live-btn" type="button" @click="handleOpenMessage">
            <svg class="start-live-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.5 11.5a7.5 7.5 0 0 1-11 6.7L4 20l1.6-4.4a7.5 7.5 0 1 1 14.9-4.1z" />
              <path d="M9 11h6M9 14.5h3.5" />
            </svg>
            <span>消息</span>
          </button>
           <button class="anchor-text-btn" type="button" @click="handleLogout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>退出登录</span>
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
            <span class="title-live-dot"></span>
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
        </div>

        <div v-else class="anchor-grid">
          <div
            v-for="item in liveList"
            :key="item.liveIndexId"
            class="anchor-card"
            :class="{ 'is-top': item.isTop }"
            @click="handleCardClick(item)"
          >
            <!-- 置顶主播左上角金色 TOP 角标 -->
            <span v-if="item.isTop" class="card-top-badge">TOP</span>
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
              <!-- 右下角白色透明 Live 图标 -->
              <span class="card-live-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                  <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
                  <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
                  <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </span>
            </div>
            <div class="card-info">
              <div class="card-avatar-wrap">
                <img
                  v-if="item.avatar"
                  class="card-avatar"
                  :src="resolveImageUrl(item.avatar)"
                  alt=""
                  @error="onCardAvatarError"
                />
                <div v-else class="card-avatar card-avatar-empty" />
                <span class="card-live-tag">LIVE</span>
              </div>
              <div class="card-text">
                <div class="card-title">
                  <span class="card-title-text">{{ item.title || '直播中' }}</span>
                  <span v-if="item.isCharge === 1" class="card-charge">付费</span>
                  <span v-if="item.pkStatus === 1 || item.pkStatus === 2" class="card-pk-tag">PK中</span>
                  <span v-else-if="item.pkStatus === 3" class="card-cohost-tag">连麦中</span>
                </div>
                <div class="card-subtitle">
                  <span class="card-nickname">{{ item.nickname || '主播' }}</span>
                  <span v-if="item.gender === 1" class="card-gender card-gender-male">♂</span>
                  <span v-else-if="item.gender === 2" class="card-gender card-gender-female">♀</span>
                </div>
                <div class="card-meta">
                  <span v-if="item.anchorShowId" class="card-id">ID:{{ item.anchorShowId }}</span>
                  <span v-if="item.orientation" class="card-orient-tag">{{ item.orientation === 'landscape' ? '横屏' : '竖屏' }}</span>
                  <span v-if="item.organizationName" class="card-org-tag">{{ item.organizationName }}</span>
                </div>
              </div>
              <div v-if="item.audienceAvatars.length" class="card-audience-stack">
                <img
                  v-for="(avatar, idx) in item.audienceAvatars"
                  :key="idx"
                  class="card-audience-avatar"
                  :src="resolveImageUrl(avatar)"
                  :style="{ zIndex: item.audienceAvatars.length - idx }"
                  alt=""
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 悬浮圆形开播按钮：页面底部居中（仅主播展示） -->
      <button v-if="isAnchor" class="anchor-fab-start" type="button" aria-label="去开播" @click="handleStartLive">
        <IconLiveStart class="anchor-fab-icon" />
        <span>开播</span>
      </button>

      <!-- 关注列表弹窗：/live/attentionLiveList 在播的关注主播 -->
      <div v-if="followListVisible" class="follow-mask" @click.self="closeFollowList">
        <div class="follow-panel">
          <div class="follow-panel-header">
            <div class="follow-panel-title">
              <span>关注列表</span>
              <span class="follow-panel-count">{{ followList.length }} 位正在直播</span>
            </div>
            <button class="follow-panel-close" type="button" aria-label="关闭" @click="closeFollowList">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="follow-panel-body">
            <div v-if="followError" class="follow-state">
              <p>关注列表加载失败：{{ followError }}</p>
              <button class="anchor-retry-btn" type="button" :disabled="followLoading" @click="loadFollowList">重试</button>
            </div>
            <div v-else-if="followLoading" class="follow-state">加载中...</div>
            <div v-else-if="!followList.length" class="follow-state">
              <IconLive class="follow-empty-icon" />
              <p>关注的主播都还没开播</p>
            </div>
            <div v-else class="follow-grid">
              <div
                v-for="item in followList"
                :key="item.liveIndexId"
                class="follow-card"
                @click="enterFollowLive(item)"
              >
                <div class="follow-card-cover">
                  <video
                    v-if="item.playUrl"
                    :ref="(el) => setFollowVideoRef(item.liveIndexId, el)"
                    :data-live-id="item.liveIndexId"
                    class="follow-card-video"
                    muted
                    autoplay
                    playsinline
                  />
                  <img
                    v-else-if="item.cover"
                    class="follow-card-video"
                    :src="resolveImageUrl(item.cover)"
                    alt=""
                  />
                  <div v-else class="follow-card-empty">
                    <IconLive />
                  </div>
                  <span class="follow-card-enter">进入直播间</span>
                </div>
                <div class="follow-card-info">
                  <img
                    v-if="item.avatar"
                    class="follow-card-avatar"
                    :src="resolveImageUrl(item.avatar)"
                    alt=""
                  />
                  <div v-else class="follow-card-avatar follow-card-avatar-empty" />
                  <div class="follow-card-text">
                    <span class="follow-card-title">{{ item.title || '直播中' }}</span>
                    <span class="follow-card-name">{{ item.nickname || '主播' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 退出登录确认弹窗 -->
      <div v-if="showLogoutConfirm" class="logout-confirm-mask" @click.self="cancelLogout">
        <div class="logout-confirm-dialog">
          <div class="logout-confirm-title">退出登录</div>
          <div class="logout-confirm-text">确定要退出当前账号吗？</div>
          <div class="logout-confirm-actions">
            <button class="logout-confirm-btn logout-confirm-cancel" type="button" @click="cancelLogout">取消</button>
            <button class="logout-confirm-btn logout-confirm-ok" type="button" @click="confirmLogout">确认退出</button>
          </div>
        </div>
      </div>

      <!-- 消息中心：基于 TUIChatEngine C2C 单聊 -->
      <MessageCenter :visible="messageCenterVisible" @close="messageCenterVisible = false" />
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IconLive, IconLiveStart, UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';
import SvgIcon from '../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../TUILiveKit/common/icons/CloseIcon.vue';
import { isMacPlatform } from '../TUILiveKit/utils/platform';
import { showMessage, MessageToastType } from '../TUILiveKit/base-component/MessageToast';
import { NIKO_CONFIG, resolveImageUrl } from '../niko/config';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { fetchAttentionLiveList, fetchRecommendLiveList, getAnchorCenter } from '../niko/api/live';
import { type NikoLiveListItem } from '../niko/api/liveList';
import { createStreamPlayer, type StreamPlayerHandle } from '../niko/utils/flvPlayer';
import { useAuthStore } from '../niko/store/auth';
import MessageCenter from '../niko/components/MessageCenter.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { logout: logoutIm, login: loginIm } = useLoginState();

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
/** 是否主播（/api/user/personalInfo 的 is_anchor）：非主播隐藏开播入口 */
const isAnchor = computed(() => authStore.isAnchor);

/**
 * 加载主播列表（数据源：/live/recommendLiveList，业务域 + 登录 Token）。
 * 页面首次进入只请求一次；点击刷新按钮传 force=true 强制重新请求；
 * silent=true 为无感刷新（后台定时同步），不展示 loading 也不打断页面。
 */
async function loadList(force = false, silent = false) {
  if (!silent) {
    loading.value = true;
    apiError.value = '';
  }
  try {
    const result = await fetchRecommendLiveList(1, 20, { force });
    liveList.value = result.list;
    total.value = result.total;
    // 刷新后下播的主播不再保留预览播放器
    const validIds = new Set(result.list.map((item) => item.liveIndexId));
    previewHandles.forEach((_handle, id) => {
      if (!validIds.has(id)) {
        stopPreview(id);
      }
    });
  } catch (error) {
    // 无感刷新失败保留当前列表，只打日志，避免列表被清空闪动
    if (silent) {
      console.warn('[AnchorList] silent refresh failed:', error);
      return;
    }
    apiError.value = error instanceof Error ? error.message : String(error);
    liveList.value = [];
    total.value = 0;
    console.error('[AnchorList] fetchRecommendLiveList failed:', error);
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

// 无感刷新定时器句柄
let silentTimer: number | null = null;

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
      anchorId: item.anchorUserId,
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

// 关注列表：GET 关注主播在播列表（/live/attentionLiveList）
const followListVisible = ref(false);
const followList = ref<NikoLiveListItem[]>([]);
const followLoading = ref(false);
const followError = ref('');

async function loadFollowList() {
  followLoading.value = true;
  followError.value = '';
  try {
    const result = await fetchAttentionLiveList(1, 500);
    followList.value = result.list;
  } catch (error) {
    followList.value = [];
    followError.value = error instanceof Error ? error.message : String(error);
    console.error('[AnchorList] fetchAttentionLiveList failed:', error);
  } finally {
    followLoading.value = false;
  }
}

function handleOpenFollowList() {
  followListVisible.value = true;
  void loadFollowList();
}

function closeFollowList() {
  followListVisible.value = false;
  // 关闭弹窗时停止所有预览拉流，避免后台继续占用带宽
  followPreviewHandles.forEach((handle) => handle.destroy());
  followPreviewHandles.clear();
  followVideoEls.clear();
}

/* ---------------- 关注列表预览（独立于主列表，避免与主列表共用播放器） ---------------- */
const followVideoEls = new Map<string, HTMLVideoElement>();
const followPreviewHandles = new Map<string, StreamPlayerHandle>();

function stopFollowPreview(id: string) {
  const handle = followPreviewHandles.get(id);
  if (handle) {
    handle.destroy();
    followPreviewHandles.delete(id);
  }
}

async function startFollowPreview(id: string) {
  if (followPreviewHandles.has(id)) {
    return;
  }
  const el = followVideoEls.get(id);
  if (!el) {
    return;
  }
  const item = followList.value.find((entry) => entry.liveIndexId === id);
  if (!item?.playUrl) {
    return;
  }
  try {
    const handle = await createStreamPlayer(el, item.playUrl, {
      muted: true,
      onError: (detail) => console.warn('[AnchorList] follow preview failed:', id, detail),
    });
    if (followVideoEls.get(id) !== el) {
      handle.destroy();
      return;
    }
    followPreviewHandles.set(id, handle);
  } catch (error) {
    console.warn('[AnchorList] follow preview error:', id, error);
  }
}

function setFollowVideoRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLVideoElement) {
    followVideoEls.set(id, el);
    followPreviewObserver?.observe(el);
    return;
  }
  followVideoEls.delete(id);
  stopFollowPreview(id);
}

const followPreviewObserver: IntersectionObserver | null = typeof IntersectionObserver === 'undefined'
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
          void startFollowPreview(id);
        } else {
          stopFollowPreview(id);
        }
      });
    },
    { rootMargin: '200px' },
  );

function enterFollowLive(item: NikoLiveListItem) {
  closeFollowList();
  handleCardClick(item);
}

// 消息：打开消息中心弹窗（基于 TUIChatEngine C2C 单聊）
// AnchorList 主窗口默认不走 IM 登录，这里先用本地登录凭据补登一次再打开
const messageCenterVisible = ref(false);
const messageCenterOpening = ref(false);
async function handleOpenMessage() {
  if (messageCenterOpening.value) return;
  messageCenterOpening.value = true;
  try {
    const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!stored) {
      showMessage({ type: MessageToastType.Error, message: '登录信息失效，请重新登录' });
      return;
    }
    const { sdkAppId, userId, userSig } = JSON.parse(stored);
    // useLoginState().login 内部幂等：已登录且同 userId 直接返回
    await loginIm({
      sdkAppId: Number(sdkAppId),
      userId: String(userId),
      userSig: String(userSig),
    });
    messageCenterVisible.value = true;
  } catch (error: any) {
    console.error('[AnchorList] open message center failed:', error);
    showMessage({ type: MessageToastType.Error, message: `消息中心打开失败：${error?.message || 'IM 登录失败'}` });
  } finally {
    messageCenterOpening.value = false;
  }
}

// 退出登录二次确认：点击「退出登录」先弹窗，确认后才执行登出
const showLogoutConfirm = ref(false);

function handleLogout() {
  showLogoutConfirm.value = true;
}

function cancelLogout() {
  showLogoutConfirm.value = false;
}

async function confirmLogout() {
  showLogoutConfirm.value = false;
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

// 站外业务页 SSO 配置：三个内嵌 H5 项目读取登录态的方式不同，主进程会一次性写入所有 key：
//   - h5-tixian（/withdraw）：sessionStorage['token']
//   - h5-organization（/organization）：localStorage['token'] + sessionStorage['organizationInfoObj']
//   - h5-organization-settled：localStorage['guild_token']（兜底 sessionStorage['niko-auth'].token）
//   - 公共：sessionStorage / localStorage['niko-auth']（JSON: { token }）
//   另外兼容 postMessage 握手（data.type === 'SSO_TOKEN'）
const H5_ORIGIN = NIKO_CONFIG.h5WebBase;

// 公会|家族：组织页（带尾斜杠，子应用相对路径资源才不会 404）
const ORGANIZATION_URL = `${H5_ORIGIN}/organization/`;
// 家族入驻 / 公会入驻：h5-organization-settled（vite base = /organization-settled，HashRouter）
// 两个入口统一落到入驻首页 #/settle，由页面内自行选择家族/公会
const SETTLE_URL = `${H5_ORIGIN}/organization-settled/#/settle`;
// 提现页（生产域）
const WITHDRAW_URL = `${H5_ORIGIN}/withdraw/`;

/** 软件内打开 H5 业务页并下发 SSO token（协议对齐 H5 主项目 ssoBridge） */
function openExternalWithSso(
  url: string,
  title: string,
  extra: { organizationId?: number } = {},
) {
  window.ipcRenderer?.send('open-internal-url', {
    url,
    title,
    sso: {
      token: authStore.token || '',
      origin: H5_ORIGIN,
      // 公会页需要组织 id（sessionStorage['organizationInfoObj']），由主播中心接口带出
      organizationId: extra.organizationId,
    },
  });
}

async function openOrganizationPage() {
  // 优先用个人信息接口下发的 organization_info.id（organization_mode 决定公会/家族）
  let organizationId: number | undefined = authStore.organizationId;
  if (!organizationId) {
    try {
      const anchorData = await getAnchorCenter();
      organizationId = anchorData?.organization_info?.id ?? anchorData?.organization_id ?? undefined;
    } catch (error) {
      console.warn('[AnchorList] getAnchorCenter failed before opening organization page:', error);
    }
  }
  openExternalWithSso(ORGANIZATION_URL, '公会|家族', { organizationId });
}

/** 跳转到主播中心页面 */
function goAnchorCenter() {
  router.push({ name: 'anchor-center' });
}

function openSettlePage(kind: 'family' | 'guild') {
  openExternalWithSso(SETTLE_URL, kind === 'guild' ? '公会入驻' : '家族入驻');
}

function openWithdrawPage() {
  openExternalWithSso(WITHDRAW_URL, '提现');
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

/** 静默刷新进行中标记：2 秒间隔较密，避免上一次请求没返回时重复叠加 */
let silentRefreshing = false;
async function refreshSilently() {
  if (silentRefreshing) {
    return;
  }
  silentRefreshing = true;
  try {
    await loadList(true, true);
  } finally {
    silentRefreshing = false;
  }
}

onMounted(() => {
  // 恢复登录态的会话没有登录回调，这里补拉一次个人信息（is_anchor / organization_info）
  void authStore.loadPersonalInfo();
  void loadList();
  // 挂载后立刻强制静默拉一次：无论是首次进入还是从直播间/其他页面返回，
  // 列表数据都马上是最新的，不用等第一次 2 秒轮询
  void refreshSilently();
  // 无感刷新：每 2 秒后台同步一次在播数据，不展示 loading、不打断预览
  silentTimer = window.setInterval(() => {
    void refreshSilently();
  }, 2 * 1000);
});

// keep-alive 场景下返回列表（组件未销毁、只被重新激活）也要立即刷新
onActivated(() => {
  void refreshSilently();
});

// 路由 watch：从直播间/其他页面返回主播列表时立即静默刷新（不等待）
// 覆盖场景：router.replace('anchor-list') / router.push('anchor-list')
watch(
  () => route.name,
  (name) => {
    if (name === 'anchor-list') {
      void refreshSilently();
    }
  },
);

onBeforeUnmount(() => {
  if (silentTimer !== null) {
    window.clearInterval(silentTimer);
    silentTimer = null;
  }
  previewObserver?.disconnect();
  previewHandles.forEach((handle) => handle.destroy());
  previewHandles.clear();
  videoEls.clear();
});
</script>

<style lang="scss" scoped>
.anchor-list-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  color: var(--text-color-primary, #ffffff);
  background-color: var(--bg-color-topbar, #141518);
  box-sizing: border-box;
}

/* 悬浮圆形开播按钮 */
.anchor-fab-start {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  width: 3.75rem;
  height: 3.75rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(135deg, #ff7aa2, #ff3d71);
  border: none;
  border-radius: 50%;
  box-shadow: 0 8px 20px rgba(255, 61, 113, 0.4);
  transform: translateX(-50%);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    box-shadow: 0 10px 26px rgba(255, 61, 113, 0.55);
    transform: translateX(-50%) translateY(-2px);
  }

  .anchor-fab-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  span {
    font-size: 0.625rem;
    font-weight: 600;
    line-height: 1;
  }
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
    height: 30px;
    width: 105px;
    padding-left: 11px;
    margin-top: 10px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 7px;
    box-sizing: border-box;

    .logo-icon {
      width: 1.375rem;
      height: 1.375rem;
      object-fit: cover;
      border-radius: 50%;
    }

    .logo-title {
      padding-left: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
    }
  }

  .anchor-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 10px;
    -webkit-app-region: no-drag;
  }

  .anchor-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;

    .anchor-user-avatar-ring {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;

      /* 360 度旋转外光圈 */
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(from 0deg, #2b7fff, #7fd0ff, #b58cff, #2b7fff);
        animation: anchor-avatar-ring-spin 2.4s linear infinite;
      }

      &::after {
        content: '';
        position: absolute;
        inset: 2px;
        border-radius: 50%;
        background: var(--bg-color-topbar, #141518);
      }

      .anchor-user-avatar {
        position: relative;
        z-index: 1;
      }
    }

    .anchor-user-avatar {
      width: 1.375rem;
      height: 1.375rem;
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

    /* 昵称流光闪动 */
    .anchor-user-name-shine {
      font-weight: 600;
      background: linear-gradient(90deg, #ffffff 0%, #ffffff 40%, #7fd0ff 50%, #ffffff 60%, #ffffff 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: anchor-name-shine 2.4s linear infinite;
    }
  }

  @keyframes anchor-avatar-ring-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes anchor-name-shine {
    0% {
      background-position: 100% 0;
    }

    100% {
      background-position: -100% 0;
    }
  }

  .anchor-text-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #ffffff;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 0.25rem;

    svg {
      width: 0.875rem;
      height: 0.875rem;
      flex: none;
    }

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
    /* 去掉按钮底色，白字展示 */
    background-color: transparent;
    border: none;
    border-radius: 0.375rem;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
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
    align-items: center;
    gap: 0.5rem;
  }

  /* 直播状态呼吸小圆点 */
  .title-live-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #ff4d6a;
    box-shadow: 0 0 6px rgba(255, 77, 106, 0.8);
    animation: title-live-dot-breath 1.6s ease-in-out infinite;
  }

  .title-text {
    font-size: 1.0625rem;
    font-weight: 700;
    letter-spacing: 0.0625rem;
    background: linear-gradient(90deg, #ffffff, #9ec5ff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .title-count {
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    color: #9ec5ff;
    background: rgba(43, 127, 255, 0.12);
    border: 1px solid rgba(43, 127, 255, 0.25);
    border-radius: 999px;
  }

  @keyframes title-live-dot-breath {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.5;
      transform: scale(0.8);
    }
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
}

.anchor-grid {
  width: 100%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.anchor-card {
  position: relative;
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

  /* 置顶主播：金色边框光圈 */
  &.is-top {
    box-shadow: 0 0 0 1px rgba(255, 200, 80, 0.45), 0 0 14px rgba(255, 180, 50, 0.25);

    &:hover {
      box-shadow: 0 0 0 1px rgba(255, 210, 100, 0.6), 0 0 22px rgba(255, 180, 50, 0.35);
    }
  }

  .card-top-badge {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #1a1205;
    background: linear-gradient(90deg, #ffd666, #ff9f1a);
    border-bottom-right-radius: 8px;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
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

  .card-avatar-wrap {
    position: relative;
    flex: none;
  }

  .card-avatar {
    flex: none;
    display: block;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 77, 106, 0.7);
    box-sizing: border-box;
  }

  .card-avatar-empty {
    display: block;
  }

  /* 头像右下角 LIVE 小标 */
  .card-live-tag {
    position: absolute;
    bottom: -3px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 4px;
    font-size: 8px;
    font-weight: 700;
    line-height: 12px;
    color: #fff;
    letter-spacing: 0.5px;
    background: linear-gradient(90deg, #ff4d6a, #ff7849);
    border-radius: 6px;
  }

  .card-text {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
    overflow: hidden;

    .card-title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
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

  .card-gender {
    flex: none;
    font-size: 10px;
    font-weight: 700;
    width: 14px;
    height: 14px;
    line-height: 14px;
    text-align: center;
    border-radius: 50%;
  }

  .card-gender-male {
    color: #fff;
    background: #3ba1ff;
  }

  .card-gender-female {
    color: #fff;
    background: #ff6b9d;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.45));
  }

  .card-id {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-orient-tag {
    flex: none;
    padding: 0 4px;
    line-height: 14px;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .card-pk-tag {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    line-height: 15px;
    color: #fff;
    border-radius: 2px;
    background: linear-gradient(90deg, #ff4d6a, #b58cff);
  }

  .card-cohost-tag {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    line-height: 15px;
    color: #fff;
    border-radius: 2px;
    background: linear-gradient(90deg, #2b7fff, #7fd0ff);
  }

  .card-org-tag {
    flex: none;
    max-width: 6rem;
    padding: 0 4px;
    line-height: 14px;
    border-radius: 2px;
    color: #ffd591;
    border: 1px solid rgba(255, 213, 145, 0.35);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 封面右下角白色透明 Live 图标 */
  .card-live-icon {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 50%;
    backdrop-filter: blur(2px);
    pointer-events: none;
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

  /* 在线观众头像叠层 */
  .card-audience-stack {
    flex: none;
    display: flex;
    align-items: center;
    padding-left: 4px;
  }

  .card-audience-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid var(--bg-color-operate, #22252b);
    box-sizing: border-box;

    & + .card-audience-avatar {
      margin-left: -8px;
    }
  }
}

/* ==================== 退出登录确认弹窗 ==================== */
.logout-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: logout-mask-fade-in 0.2s ease;
}

.logout-confirm-dialog {
  width: 320px;
  padding: 24px;
  background: var(--bg-color-dialog, #22252b);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: logout-dialog-slide-up 0.25s ease;
}

.logout-confirm-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
}

.logout-confirm-text {
  margin-top: 10px;
  font-size: 0.8125rem;
  color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  text-align: center;
}

.logout-confirm-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.logout-confirm-btn {
  flex: 1;
  height: 34px;
  font-size: 0.8125rem;
  border: none;
  border-radius: 17px;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.85;
  }
}

.logout-confirm-cancel {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
}

.logout-confirm-ok {
  color: #ffffff;
  font-weight: 600;
  background: var(--uikit-color-primary, #2b7fff);
}

@keyframes logout-mask-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes logout-dialog-slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ==================== 关注列表弹窗 ==================== */
.follow-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: logout-mask-fade-in 0.2s ease;
}

.follow-panel {
  display: flex;
  flex-direction: column;
  width: min(1440px, calc(50vw - 3rem));
  height: 80vh;
  max-height: calc(100vh - 3rem);
  background: var(--bg-color-dialog, #22252b);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.follow-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.follow-panel-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;

  .follow-panel-count {
    font-size: 0.75rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.5);
  }
}

.follow-panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 0.375rem;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.14);
  }
}

.follow-panel-body {
  flex: 1;
  min-height: 0;
  padding: 1rem 1.25rem 1.25rem;
  overflow-y: auto;
}

.follow-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 0;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.55);

  p {
    margin: 0;
    word-break: break-all;
  }

  .follow-empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(255, 255, 255, 0.28);
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

.follow-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.875rem;
}

.follow-card {
  flex: 0 0 190px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.5rem;
  transition: border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: rgba(255, 122, 162, 0.45);
    transform: translateY(-2px);

    .follow-card-enter {
      opacity: 1;
    }
  }
}

.follow-card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #000;
}

.follow-card-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}

.follow-card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.3);
}

.follow-card-enter {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.follow-card-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
}

.follow-card-avatar {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);

  &.follow-card-avatar-empty {
    display: block;
  }
}

.follow-card-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.125rem;
}

.follow-card-title {
  font-size: 0.75rem;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-card-name {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<template>
  <UIKitProvider theme="dark">
    <div class="anchor-list-page">
      <canvas ref="anchorSpaceCanvas" class="anchor-space-canvas" aria-hidden="true"></canvas>
      <div class="anchor-space-haze" aria-hidden="true"></div>
      <canvas v-if="isAnchor" ref="liveCameraCanvas" class="anchor-live-particle-canvas" aria-hidden="true"></canvas>
      <header class="anchor-header tui-window-header">
        <div class="anchor-header-left">
          <img class="logo-icon" src="../assets/niko-logo.png" alt="Niko直播伴侣" />
          <span class="logo-title">Niko直播伴侣</span>
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
          <!-- <button class="anchor-text-btn" type="button" @click="openWithdrawPage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 15h4" />
            </svg>
            <span>提现</span>
          </button> -->
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
          <button class="anchor-text-btn" type="button" @click="showQrDialog('recharge')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span>充值中心</span>
          </button>
          <button class="anchor-text-btn" type="button" @click="showQrDialog('anchorAuth')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>主播认证</span>
          </button>
          <button class="anchor-start-live-btn" type="button" @click="handleOpenFollowList">
            <svg class="start-live-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9.5" cy="7.5" r="3.5" />
              <path d="M3 20c0-3.2 2.9-5.5 6.5-5.5 1.9 0 3.6.7 4.6 1.8" />
              <path d="M18 10v6M15 13h6" />
            </svg>
            <span>关注列表</span>
          </button>
          <button class="anchor-start-live-btn anchor-msg-btn" type="button" @click="handleOpenMessage">
            <svg class="start-live-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.5 11.5a7.5 7.5 0 0 1-11 6.7L4 20l1.6-4.4a7.5 7.5 0 1 1 14.9-4.1z" />
              <path d="M9 11h6M9 14.5h3.5" />
            </svg>
            <span>消息</span>
            <span v-if="messageUnread > 0" class="anchor-msg-badge">{{ messageUnread > 99 ? '99+' : messageUnread }}</span>
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

      <!-- 全页粒子汇聚开播按钮：悬停后在页面底部居中成型 -->
      <button v-if="isAnchor" ref="liveStartButton" class="anchor-fab-start" type="button" aria-label="去开播" @click="handleStartLive">
        <span class="anchor-fab-hint">开播</span>
      </button>

      <!-- 关注列表弹窗：/live/attentionLiveList 在播的关注主播 -->
      <div v-if="followListVisible" class="follow-mask" @click.self="closeFollowList">
        <div class="follow-panel">
          <canvas ref="followGravityCanvas" class="follow-gravity-canvas" aria-hidden="true"></canvas>
          <div class="follow-panel-header">
            <div class="follow-panel-title">
              <span class="follow-panel-title-orbit" aria-hidden="true"><span></span></span>
              <span class="follow-panel-title-copy">
                <span class="follow-panel-eyebrow">FOLLOWING · LIVE ORBIT</span>
                <span class="follow-panel-heading">
                  <span>关注列表</span>
                  <span class="follow-panel-count">{{ followList.length }} 位正在直播</span>
                </span>
              </span>
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
                  <div class="follow-card-cover-shade" aria-hidden="true"></div>
                  <span class="follow-card-live"><span></span>LIVE</span>
                  <span class="follow-card-viewers">{{ item.viewerCount }} 人观看</span>
                  <span class="follow-card-enter">进入直播间 <span aria-hidden="true">↗</span></span>
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

      <!-- 充值中心 / 主播认证 二维码弹窗 -->
      <div v-if="qrVisible" class="qr-mask" @click.self="closeQrDialog">
        <div class="qr-dialog">
          <div class="qr-dialog-header">
            <span class="qr-dialog-title">{{ qrTitle }}</span>
            <span class="qr-dialog-env"></span>
            <button class="qr-dialog-close" type="button" @click="closeQrDialog">×</button>
          </div>
          <div class="qr-dialog-body">
            <img
              class="qr-img"
              :src="'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(qrUrl)"
              :alt="qrTitle"
            />
            <div class="qr-tip">手机扫码进入{{ qrTitle }}</div>
          </div>
        </div>
      </div>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance, type Ref } from 'vue';
import * as THREE from 'three/src/Three.js';
import { useRoute, useRouter } from 'vue-router';
import { IconLive, UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { TUILogin } from '@tencentcloud/tui-core-lite';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';
import TUIMessageBox from '../TUILiveKit/common/base/MessageBox';
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
const { t } = useUIKit();
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
const liveCameraCanvas = ref<HTMLCanvasElement | null>(null);
const liveStartButton = ref<HTMLButtonElement | null>(null);
const anchorSpaceCanvas = ref<HTMLCanvasElement | null>(null);
let cleanupLiveCamera: (() => void) | null = null;
let cleanupAnchorSpace: (() => void) | null = null;

/** 二维码弹窗（充值中心 / 主播认证） */
const qrVisible = ref(false);
const qrTitle = ref('');
const qrUrl = ref('');
const qrEnvLabel = computed(() => (NIKO_CONFIG.apiBaseUrl.includes('test') ? '测试环境' : '正式环境'));

function showQrDialog(kind: 'recharge' | 'anchorAuth') {
  if (kind === 'recharge') {
    qrTitle.value = '充值中心';
    qrUrl.value = NIKO_CONFIG.rechargeCenterUrl;
  } else {
    qrTitle.value = '主播认证';
    qrUrl.value = NIKO_CONFIG.anchorAuthUrl;
  }
  qrVisible.value = true;
}
function closeQrDialog() {
  qrVisible.value = false;
}

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

/** 真实感五角星贴图：硬边几何 + 白色核心 + 外圈柔光，像真的流星星头 */
function createStarTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44; // 星尖外半径
  const innerR = size * 0.18; // 凹处内半径
  const spikes = 5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2); // 顶尖朝上
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  // 亮青白色填充
  ctx.fillStyle = '#f0fbff';
  ctx.fill();
  // 白色高光核心
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.2);
  coreGrad.addColorStop(0, 'rgba(255,255,255,1)');
  coreGrad.addColorStop(0.6, 'rgba(220,245,255,0.7)');
  coreGrad.addColorStop(1, 'rgba(180,220,255,0)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = coreGrad;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // 外圈柔光（additive blending 下会发光）
  const haloGrad = ctx.createRadialGradient(cx, cy, outerR * 0.9, cx, cy, size * 0.5);
  haloGrad.addColorStop(0, 'rgba(180,220,255,0.55)');
  haloGrad.addColorStop(0.4, 'rgba(120,190,255,0.2)');
  haloGrad.addColorStop(1, 'rgba(80,160,255,0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAnchorSpaceScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 0, 8);

  const grid = new THREE.GridHelper(34, 44, 0x245fa5, 0x132d53);
  grid.position.set(0, -3.1, -4);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.16;
  scene.add(grid);

  // 相机视差：鼠标移动时场景相机轻微偏移，增加深度感
  const pointer = { x: 0, y: 0 };
  const handlePointer = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const handleWindowBlur = () => {
    pointer.x = 0;
    pointer.y = 0;
  };
  window.addEventListener('pointermove', handlePointer, { passive: true });
  window.addEventListener('blur', handleWindowBlur);

  // ── 开播按钮粒子：汇聚成「NIKO LIVE」文字形状 ──

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  const animate = () => {
    const delta = Math.min(0.1, clock.getDelta());
    const elapsed = clock.elapsedTime;

    grid.position.z = -4 + (elapsed * 0.1) % 0.7;
    camera.position.x += (pointer.x * 0.16 - camera.position.x) * 0.03;
    camera.position.y += (-pointer.y * 0.1 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -2);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', handlePointer);
    window.removeEventListener('blur', handleWindowBlur);
    scene.traverse((object) => {
      const drawable = object as THREE.Mesh;
      drawable.geometry?.dispose?.();
      if (Array.isArray(drawable.material)) {
        drawable.material.forEach((material) => material.dispose());
      } else {
        drawable.material?.dispose?.();
      }
    });
    renderer.dispose();
  };
}

function createLiveCameraScene(canvas: HTMLCanvasElement, button: HTMLButtonElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  camera.position.z = 500;

  const vertexShader = `
    attribute float aSize;
    uniform float uPixelRatio;
    uniform float uFormation;
    uniform float uScale;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = aSize * uPixelRatio * mix(0.8, 1.15, uFormation) * uScale;
    }
  `;
  const fragmentShader = `
    uniform float uFormation;
    varying vec3 vColor;
    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float radius = dot(uv, uv);
      if (radius > 1.0) discard;
      float sphereZ = sqrt(max(0.0, 1.0 - radius));
      vec3 particleNormal = normalize(vec3(uv.x, -uv.y, sphereZ));
      vec3 lightDirection = normalize(vec3(-0.45, 0.65, 1.0));
      float diffuse = max(dot(particleNormal, lightDirection), 0.0);
      float specular = pow(diffuse, 22.0) * 0.42;
      float rim = pow(1.0 - sphereZ, 2.0) * 0.12;
      vec3 shadedColor = vColor * (0.42 + diffuse * 0.82) + vec3(specular + rim);
      float edgeAlpha = 1.0 - smoothstep(0.78, 1.0, radius);
      gl_FragColor = vec4(shadedColor, edgeAlpha * mix(0.48, 0.98, uFormation));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  type ParticleCloud = {
    points: THREE.Points;
    material: THREE.ShaderMaterial;
    target: Float32Array;
    scattered: Float32Array;
    seeds: Float32Array;
  };

  const makeCloud = (targets: number[], colors: number[], sizes: number[]): ParticleCloud => {
    const count = targets.length / 3;
    const target = new Float32Array(targets);
    const scattered = new Float32Array(target.length);
    const positions = new Float32Array(target.length);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      seeds[i * 4] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(positions, 3);
    position.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', position);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
        uFormation: { value: 0 },
        uScale: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return { points, material, target, scattered, seeds };
  };

  const cameraTargets: number[] = [];
  const cameraColors: number[] = [];
  const cameraSizes: number[] = [];
  const addCameraPoint = (x: number, y: number, z: number, color: THREE.Color) => {
    cameraTargets.push(x, y, z);
    cameraColors.push(color.r, color.g, color.b);
    cameraSizes.push(2 + Math.random() * 0.95);
  };
  const bodyPalette = [0x1f5eae, 0x287fd0, 0x163d7a, 0x3a8dcc].map((color) => new THREE.Color(color));
  const lensPalette = [0x123c68, 0x1e9cc2, 0x77e6ff].map((color) => new THREE.Color(color));

  const addBoxSurface = (
    count: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    width: number,
    height: number,
    depth: number,
    palette: THREE.Color[],
  ) => {
    for (let i = 0; i < count; i += 1) {
      let x = centerX + (Math.random() - 0.5) * width;
      let y = centerY + (Math.random() - 0.5) * height;
      let z = centerZ + (Math.random() - 0.5) * depth;
      const face = Math.floor(Math.random() * 6);
      let shade = 1;
      if (face === 0) { x = centerX - width / 2; shade = 0.62; }
      if (face === 1) { x = centerX + width / 2; shade = 0.82; }
      if (face === 2) { y = centerY - height / 2; shade = 0.52; }
      if (face === 3) { y = centerY + height / 2; shade = 1.28; }
      if (face === 4) { z = centerZ - depth / 2; shade = 0.58; }
      if (face === 5) { z = centerZ + depth / 2; shade = 1.08; }
      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.multiplyScalar(shade * (0.86 + Math.random() * 0.26));
      addCameraPoint(x, y, z, color);
    }
  };

  // 机身与取景器只保留高密度表面颗粒，利用遮挡形成实心体积。
  addBoxSurface(2400, 0, 12, 0, 72, 44, 28, bodyPalette);
  addBoxSurface(400, -12, 39, -2, 24, 10, 20, bodyPalette);

  // 镜头包含玻璃前面、金属侧面、亮环与局部高光。
  for (let i = 0; i < 1400; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const mode = Math.random();
    let radius = Math.sqrt(Math.random()) * 16;
    let z = 34 + Math.random() * 0.8;
    let color = lensPalette[0].clone();
    if (mode >= 0.45 && mode < 0.8) {
      radius = 17;
      z = 14 + Math.random() * 20;
      color = lensPalette[1].clone().multiplyScalar(0.68 + Math.random() * 0.38);
    } else if (mode >= 0.8) {
      radius = 17 + (Math.random() - 0.5) * 1.1;
      z = 34.5;
      color = lensPalette[2].clone();
    } else if (radius > 11) {
      color = lensPalette[1].clone();
    }
    addCameraPoint(Math.cos(angle) * radius, 12 + Math.sin(angle) * radius, z, color);
  }
  for (let i = 0; i < 90; i += 1) {
    addCameraPoint(
      -5 + (Math.random() - 0.5) * 7,
      18 + (Math.random() - 0.5) * 5,
      35.2,
      new THREE.Color(0xc8f7ff),
    );
  }

  const cameraCloud = makeCloud(cameraTargets, cameraColors, cameraSizes);
  scene.add(cameraCloud.points);

  const textTargets: number[] = [];
  const textColors: number[] = [];
  const textSizes: number[] = [];
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 128;
  textCanvas.height = 48;
  const context = textCanvas.getContext('2d', { willReadFrequently: true });
  if (context) {
    context.fillStyle = '#ffffff';
    context.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('开播', 64, 25);
    const pixels = context.getImageData(0, 0, 128, 48).data;
    const textPalette = [0xd7f6ff, 0x8fdcf2, 0x75bddd].map((color) => new THREE.Color(color));
    for (let y = 0; y < 48; y += 2) {
      for (let x = 0; x < 128; x += 2) {
        if (pixels[(y * 128 + x) * 4 + 3] < 110) continue;
        const color = textPalette[Math.floor(Math.random() * textPalette.length)].clone();
        color.multiplyScalar(0.86 + Math.random() * 0.24);
        textTargets.push(x - 64, -44 + 24 - y, 34 + (Math.random() - 0.5) * 2);
        textColors.push(color.r, color.g, color.b);
        textSizes.push(1.7 + Math.random() * 0.9);
      }
    }
  }
  const textCloud = makeCloud(textTargets, textColors, textSizes);
  scene.add(textCloud.points);
  const clouds = [cameraCloud, textCloud];

  let formation = 0;
  let targetFormation = 0;
  const startFormation = () => { targetFormation = 1; };
  const stopFormation = () => { targetFormation = 0; };
  button.addEventListener('mouseenter', startFormation);
  button.addEventListener('mouseleave', stopFormation);
  button.addEventListener('focus', startFormation);
  button.addEventListener('blur', stopFormation);

  const layout = () => {
    const pageRect = canvas.parentElement?.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (!pageRect || pageRect.width < 1 || pageRect.height < 1) return;
    const { width, height } = pageRect;
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();

    const centerX = buttonRect.left - pageRect.left + buttonRect.width / 2 - width / 2;
    const centerY = height / 2 - (buttonRect.top - pageRect.top + buttonRect.height / 2);
    clouds.forEach((cloud) => {
      cloud.points.position.set(centerX, centerY, 0);
      const count = cloud.target.length / 3;
      for (let i = 0; i < count; i += 1) {
        const offset = i * 3;
        cloud.scattered[offset] = Math.random() * width - width / 2 - centerX;
        cloud.scattered[offset + 1] = height / 2 - Math.random() * height - centerY;
        cloud.scattered[offset + 2] = (Math.random() - 0.5) * 180;
      }
    });
  };
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(canvas);
  resizeObserver.observe(button);
  layout();

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const easeInOutCubic = (value: number) => (
    value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
  );
  const updateCloud = (cloud: ParticleCloud, elapsed: number) => {
    const attribute = cloud.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    const count = cloud.target.length / 3;
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      const seedA = cloud.seeds[i * 4];
      const seedB = cloud.seeds[i * 4 + 1];
      const delay = cloud.seeds[i * 4 + 2] * 0.18;
      const driftSpeed = 0.6 + cloud.seeds[i * 4 + 3] * 0.5;
      const progress = easeInOutCubic(clamp01((formation - delay) / 0.82));
      const arc = Math.sin(progress * Math.PI) * 10;
      const drift = (1 - progress) * 2.2;
      const settledGrain = Math.sin(elapsed * 1.8 + seedA) * 0.12 * progress;
      positions[offset] = cloud.scattered[offset]
        + (cloud.target[offset] - cloud.scattered[offset]) * progress
        + Math.sin(seedA + elapsed * 0.9) * arc
        + Math.sin(elapsed * driftSpeed + seedB) * drift
        + settledGrain;
      positions[offset + 1] = cloud.scattered[offset + 1]
        + (cloud.target[offset + 1] - cloud.scattered[offset + 1]) * progress
        + Math.cos(seedB + elapsed * 0.8) * arc
        + Math.cos(elapsed * driftSpeed + seedA) * drift
        + settledGrain;
      positions[offset + 2] = cloud.scattered[offset + 2]
        + (cloud.target[offset + 2] - cloud.scattered[offset + 2]) * progress
        + Math.sin(seedA + seedB + elapsed) * arc
        + Math.sin(elapsed * driftSpeed + seedB) * drift * 2;
    }
    attribute.needsUpdate = true;
  };

  const clock = new THREE.Clock();
  let raf = 0;
  const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    const duration = targetFormation > formation ? 1.6 : 1.05;
    if (targetFormation > formation) formation = Math.min(targetFormation, formation + delta / duration);
    if (targetFormation < formation) formation = Math.max(targetFormation, formation - delta / duration);
    const formed = easeInOutCubic(formation);

    clouds.forEach((cloud) => {
      updateCloud(cloud, elapsed);
      cloud.material.uniforms.uFormation.value = formed;
      cloud.material.uniforms.uScale.value = 1 + formed; // hover 时放大约 2 倍
    });
    cameraCloud.points.rotation.y = (-0.22 + Math.sin(elapsed * 0.7) * 0.04) * formed;
    cameraCloud.points.rotation.x = (-0.06 + Math.sin(elapsed * 0.55) * 0.025) * formed;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    button.removeEventListener('mouseenter', startFormation);
    button.removeEventListener('mouseleave', stopFormation);
    button.removeEventListener('focus', startFormation);
    button.removeEventListener('blur', stopFormation);
    scene.traverse((object) => {
      const drawable = object as THREE.Mesh;
      drawable.geometry?.dispose?.();
      if (Array.isArray(drawable.material)) {
        drawable.material.forEach((material) => material.dispose());
      } else {
        drawable.material?.dispose?.();
      }
    });
    renderer.dispose();
  };
}

function handleStartLive() {
  router.push({ name: isMacPlatform() ? 'tui-livekit-mac' : 'tui-live-kit-main' });
}

// 关注列表：GET 关注主播在播列表（/live/attentionLiveList）
const followListVisible = ref(false);
const followList = ref<NikoLiveListItem[]>([]);
const followLoading = ref(false);
const followError = ref('');
const followGravityCanvas = ref<HTMLCanvasElement | null>(null);
let cleanupFollowGravity: (() => void) | null = null;

function createFollowGravityScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0.1, 10.5);

  const root = new THREE.Group();
  root.rotation.set(-0.04, -0.12, -0.08);
  scene.add(root);

  scene.add(new THREE.AmbientLight(0xa99bff, 1.25));
  const keyLight = new THREE.DirectionalLight(0xffd6e5, 3.2);
  keyLight.position.set(3, 5, 7);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x62e8ff, 18, 18, 2);
  rimLight.position.set(-4, 1, 4);
  scene.add(rimLight);
  const violetLight = new THREE.PointLight(0x9b6cff, 15, 16, 2);
  violetLight.position.set(4, -3, 2);
  scene.add(violetLight);

  const core = new THREE.Group();
  root.add(core);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -1.18);
  heartShape.bezierCurveTo(-0.32, -0.86, -1.45, 0.02, -1.45, 0.76);
  heartShape.bezierCurveTo(-1.45, 1.52, -0.42, 1.82, 0, 1.05);
  heartShape.bezierCurveTo(0.42, 1.82, 1.45, 1.52, 1.45, 0.76);
  heartShape.bezierCurveTo(1.45, 0.02, 0.32, -0.86, 0, -1.18);
  const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.5,
    steps: 1,
    curveSegments: 36,
    bevelEnabled: true,
    bevelThickness: 0.13,
    bevelSize: 0.12,
    bevelSegments: 5,
  });
  heartGeometry.center();
  const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd986a8,
    emissive: 0x49152f,
    emissiveIntensity: 0.62,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
  });
  const heart = new THREE.Mesh(heartGeometry, heartMaterial);
  heart.scale.setScalar(0.78);
  core.add(heart);

  const heartAuraMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6da7,
    transparent: true,
    opacity: 0.085,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const heartAura = new THREE.Mesh(heartGeometry, heartAuraMaterial);
  heartAura.scale.setScalar(0.9);
  core.add(heartAura);

  const heartEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(heartGeometry, 28),
    new THREE.LineBasicMaterial({
      color: 0xffd3e1,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  heartEdges.scale.setScalar(0.785);
  core.add(heartEdges);

  const coreLight = new THREE.PointLight(0xff7eae, 12, 9, 2);
  coreLight.position.set(0, 0, 2);
  core.add(coreLight);

  type FollowOrbit = {
    radius: number;
    stretchX: number;
    stretchY: number;
  };
  type FollowSatellite = {
    node: THREE.Group;
    orbit: FollowOrbit;
    phase: number;
    speed: number;
  };
  type FollowFlow = {
    node: THREE.Mesh;
    orbit: FollowOrbit;
    phase: number;
    speed: number;
  };

  const orbitConfigs = [
    { radius: 1.9, stretchX: 1.18, stretchY: 0.8, rotation: [1.02, 0.18, 0.2], color: 0xff8fb6 },
    { radius: 2.5, stretchX: 1.12, stretchY: 0.72, rotation: [0.44, 0.82, -0.48], color: 0xaa82ff },
    { radius: 3.08, stretchX: 1.08, stretchY: 0.68, rotation: [1.18, -0.5, 0.72], color: 0x62deef },
    { radius: 3.58, stretchX: 1.04, stretchY: 0.62, rotation: [0.72, 0.38, 1.16], color: 0xe4a2ff },
  ];
  const satellites: FollowSatellite[] = [];
  const flows: FollowFlow[] = [];
  const satelliteGeometry = new THREE.SphereGeometry(0.09, 16, 12);
  const satelliteHaloGeometry = new THREE.SphereGeometry(0.18, 12, 8);
  const satelliteRingGeometry = new THREE.TorusGeometry(0.145, 0.008, 5, 28);
  const flowGeometry = new THREE.SphereGeometry(0.032, 8, 6);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd7b7ff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const setOrbitPosition = (object: THREE.Object3D, orbit: FollowOrbit, angle: number) => {
    object.position.set(
      Math.cos(angle) * orbit.radius * orbit.stretchX,
      Math.sin(angle) * orbit.radius * orbit.stretchY,
      0,
    );
  };

  orbitConfigs.forEach((config, orbitIndex) => {
    const group = new THREE.Group();
    const [rotationX, rotationY, rotationZ] = config.rotation;
    group.rotation.set(rotationX, rotationY, rotationZ);
    root.add(group);
    const orbit: FollowOrbit = {
      radius: config.radius,
      stretchX: config.stretchX,
      stretchY: config.stretchY,
    };

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.009, 5, 180),
      new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.3 - orbitIndex * 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.scale.set(config.stretchX, config.stretchY, 1);
    group.add(ring);

    for (let i = 0; i < 2; i += 1) {
      const node = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 1.4,
        metalness: 0.35,
        roughness: 0.2,
      });
      node.add(new THREE.Mesh(satelliteGeometry, material));
      node.add(new THREE.Mesh(satelliteHaloGeometry, haloMaterial));
      const satelliteRing = new THREE.Mesh(
        satelliteRingGeometry,
        new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      satelliteRing.rotation.set(0.7, 0.35, orbitIndex * 0.4);
      node.add(satelliteRing);
      group.add(node);
      satellites.push({
        node,
        orbit,
        phase: orbitIndex * 1.37 + i * Math.PI,
        speed: 0.1 + orbitIndex * 0.018 + i * 0.012,
      });
    }

    const flowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i += 1) {
      const node = new THREE.Mesh(flowGeometry, flowMaterial);
      group.add(node);
      flows.push({
        node,
        orbit,
        phase: (i / 4) * Math.PI * 2 + orbitIndex * 0.6,
        speed: 0.24 + orbitIndex * 0.025,
      });
    }
  });

  const connectionPositions = new Float32Array(satellites.length * 6);
  const connectionGeometry = new THREE.BufferGeometry();
  const connectionAttribute = new THREE.BufferAttribute(connectionPositions, 3);
  connectionAttribute.setUsage(THREE.DynamicDrawUsage);
  connectionGeometry.setAttribute('position', connectionAttribute);
  const connections = new THREE.LineSegments(
    connectionGeometry,
    new THREE.LineBasicMaterial({
      color: 0xb9a2ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  root.add(connections);

  const palette = [new THREE.Color(0xffb0c8), new THREE.Color(0xb59aff), new THREE.Color(0x8eefff)];
  const makeStars = (count: number, local: boolean) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      if (local) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.25 + Math.pow(Math.random(), 0.65) * 3.7;
        positions[offset] = Math.cos(angle) * radius;
        positions[offset + 1] = (Math.random() - 0.5) * 4.8;
        positions[offset + 2] = Math.sin(angle) * radius * 0.65;
      } else {
        positions[offset] = (Math.random() - 0.5) * 20;
        positions[offset + 1] = (Math.random() - 0.5) * 12;
        positions[offset + 2] = -10 + Math.random() * 11;
      }
      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.multiplyScalar(0.55 + Math.random() * 0.45);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: local ? 0.035 : 0.027,
        vertexColors: true,
        transparent: true,
        opacity: local ? 0.62 : 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
  };
  const backgroundStars = makeStars(560, false);
  const orbitalDust = makeStars(340, true);
  scene.add(backgroundStars);
  root.add(orbitalDust);

  const pointerTarget = canvas.parentElement || canvas;
  const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
  const handlePointer = (event: PointerEvent) => {
    const rect = pointerTarget.getBoundingClientRect();
    pointer.targetX = THREE.MathUtils.clamp(((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2, -1, 1);
    pointer.targetY = THREE.MathUtils.clamp(((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2, -1, 1);
  };
  const resetPointer = () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  };
  pointerTarget.addEventListener('pointermove', handlePointer, { passive: true });
  pointerTarget.addEventListener('pointerleave', resetPointer);

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewWidth = viewHeight * camera.aspect;
    root.scale.setScalar(THREE.MathUtils.clamp(viewWidth / 10.5, 0.56, 1.02));
    root.position.x = viewWidth * (camera.aspect > 1.1 ? 0.23 : 0.16);
    root.position.y = camera.aspect < 0.9 ? -0.72 : -0.48;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  const worldPosition = new THREE.Vector3();
  let raf = 0;
  let lastFrame = 0;
  const animate = (timestamp: number) => {
    raf = requestAnimationFrame(animate);
    if (timestamp - lastFrame < 1000 / 30) return;
    lastFrame = timestamp;
    const elapsed = clock.getElapsedTime();
    pointer.x += (pointer.targetX - pointer.x) * 0.045;
    pointer.y += (pointer.targetY - pointer.y) * 0.045;

    root.rotation.y = -0.12 + elapsed * 0.025 + pointer.x * 0.075;
    root.rotation.x = -0.04 + Math.sin(elapsed * 0.22) * 0.025 - pointer.y * 0.045;
    core.rotation.y = -0.2 + Math.sin(elapsed * 0.35) * 0.16 + pointer.x * 0.08;
    core.rotation.x = 0.06 + Math.sin(elapsed * 0.28) * 0.045;
    const breath = 1 + Math.sin(elapsed * 1.35) * 0.035;
    core.scale.setScalar(breath);
    heartMaterial.emissiveIntensity = 0.62 + Math.sin(elapsed * 1.35) * 0.14;
    heartAuraMaterial.opacity = 0.075 + (Math.sin(elapsed * 1.35) + 1) * 0.018;
    coreLight.intensity = 11 + (Math.sin(elapsed * 1.35) + 1) * 2;

    satellites.forEach((satellite) => {
      const angle = satellite.phase + elapsed * satellite.speed;
      setOrbitPosition(satellite.node, satellite.orbit, angle);
      satellite.node.scale.setScalar(1 + Math.sin(elapsed * 1.8 + satellite.phase) * 0.12);
    });
    flows.forEach((flow) => {
      setOrbitPosition(flow.node, flow.orbit, flow.phase + elapsed * flow.speed);
    });

    root.updateMatrixWorld(true);
    satellites.forEach((satellite, index) => {
      satellite.node.getWorldPosition(worldPosition);
      root.worldToLocal(worldPosition);
      const offset = index * 6;
      connectionPositions[offset] = 0;
      connectionPositions[offset + 1] = 0;
      connectionPositions[offset + 2] = 0;
      connectionPositions[offset + 3] = worldPosition.x;
      connectionPositions[offset + 4] = worldPosition.y;
      connectionPositions[offset + 5] = worldPosition.z;
    });
    connectionAttribute.needsUpdate = true;
    orbitalDust.rotation.y = -elapsed * 0.018;
    orbitalDust.rotation.z = elapsed * 0.008;
    backgroundStars.rotation.z = elapsed * 0.0015;
    camera.position.x += (pointer.x * 0.14 - camera.position.x) * 0.035;
    camera.position.y += (0.1 - pointer.y * 0.1 - camera.position.y) * 0.035;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    pointerTarget.removeEventListener('pointermove', handlePointer);
    pointerTarget.removeEventListener('pointerleave', resetPointer);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      const drawable = object as THREE.Mesh;
      if (drawable.geometry) geometries.add(drawable.geometry);
      if (Array.isArray(drawable.material)) {
        drawable.material.forEach((material) => materials.add(material));
      } else if (drawable.material) {
        materials.add(drawable.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
  };
}

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

/** 消息未读数：轮询 C2C 会话 unreadCount，显示在消息按钮右上角 */
const messageUnread = ref(0);
let unreadTimer: ReturnType<typeof setInterval> | null = null;
async function refreshMessageUnread() {
  try {
    const chat = (TUILogin as any).getContext?.()?.chat || (TUIChatEngine as any)?.chat;
    if (!chat?.getConversationList) return;
    const res = await chat.getConversationList();
    const list: any[] = res?.data?.conversationList || [];
    messageUnread.value = list
      .filter((conv) => String(conv.conversationID || '').startsWith('C2C'))
      .reduce((sum, conv) => sum + Number(conv.unreadCount || 0), 0);
  } catch {
    // IM 未就绪 / 登录切换中，忽略
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

watch([followListVisible, followGravityCanvas], ([visible, canvas]) => {
  cleanupFollowGravity?.();
  cleanupFollowGravity = null;
  if (!visible || !canvas) return;
  try {
    cleanupFollowGravity = createFollowGravityScene(canvas);
  } catch (error) {
    console.error('[AnchorList] follow gravity scene initialization failed:', error);
  }
}, { flush: 'post' });

watch([liveCameraCanvas, liveStartButton], ([canvas, button]) => {
  cleanupLiveCamera?.();
  cleanupLiveCamera = null;
  if (!canvas || !button) return;
  try {
    cleanupLiveCamera = createLiveCameraScene(canvas, button);
  } catch (error) {
    console.error('[AnchorList] 3D live camera initialization failed:', error);
  }
}, { flush: 'post' });

onMounted(() => {
  if (anchorSpaceCanvas.value) {
    try {
      cleanupAnchorSpace = createAnchorSpaceScene(anchorSpaceCanvas.value);
    } catch (error) {
      console.error('[AnchorList] 3D background initialization failed:', error);
    }
  }
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
  // 消息未读数：10s 轮询，打开消息中心后立即刷新
  void refreshMessageUnread();
  unreadTimer = window.setInterval(refreshMessageUnread, 10000);
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

// 关闭消息中心后立即刷新未读数（标记已读后需要归零）
watch(messageCenterVisible, (visible) => {
  if (!visible) {
    void refreshMessageUnread();
  }
});

onBeforeUnmount(() => {
  cleanupFollowGravity?.();
  cleanupFollowGravity = null;
  cleanupLiveCamera?.();
  cleanupLiveCamera = null;
  cleanupAnchorSpace?.();
  cleanupAnchorSpace = null;
  if (silentTimer !== null) {
    window.clearInterval(silentTimer);
    silentTimer = null;
  }
  if (unreadTimer !== null) {
    window.clearInterval(unreadTimer);
    unreadTimer = null;
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
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  color: var(--text-color-primary, #ffffff);
  background: #050914;
  box-sizing: border-box;
}

.anchor-space-canvas,
.anchor-space-haze {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.anchor-space-haze {
  background:
    radial-gradient(circle at 82% 18%, rgba(42, 91, 190, 0.12), transparent 34%),
    radial-gradient(circle at 12% 82%, rgba(33, 127, 178, 0.08), transparent 38%),
    linear-gradient(180deg, rgba(3, 7, 17, 0.1), rgba(3, 7, 17, 0.52));
}

.anchor-live-particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 悬浮粒子聚合成型开播按钮 */
.anchor-fab-start {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  z-index: 5;
  width: 8.5rem;
  height: 8.5rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background: radial-gradient(circle at 50% 43%, rgba(38, 116, 220, 0.24), rgba(5, 16, 38, 0.08) 48%, transparent 70%);
  border: none;
  border-radius: 50%;
  filter: drop-shadow(0 8px 18px rgba(32, 134, 255, 0.24));
  transform: translateX(-50%);
  transition: transform 0.2s ease, filter 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 22%;
    border-radius: 50%;
    background: rgba(45, 139, 255, 0.14);
    box-shadow: 0 0 24px rgba(52, 196, 255, 0.35), inset 0 0 18px rgba(92, 119, 255, 0.24);
    animation: anchor-camera-glow 2.2s ease-in-out infinite;
  }

  &:hover {
    filter: drop-shadow(0 10px 24px rgba(61, 198, 255, 0.5)) brightness(1.16);
    transform: translateX(-50%);
  }

  .anchor-fab-hint {
    position: absolute;
    z-index: 2;
    bottom: 1.15rem;
    left: 50%;
    color: rgba(177, 228, 255, 0.72);
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.1875rem;
    text-shadow: 0 0 10px rgba(101, 221, 255, 0.7);
    transform: translateX(calc(-50% + 0.0625rem));
    transition: opacity 0.2s ease 0.75s;
  }

  &:hover .anchor-fab-hint,
  &:focus-visible .anchor-fab-hint {
    opacity: 0;
    transition-delay: 0s;
  }
}

@keyframes anchor-camera-glow {
  50% { opacity: 0.5; transform: scale(1.12); }
}

@keyframes anchor-header-scan {
  0% { opacity: 0; transform: translateX(-100%); }
  20%, 80% { opacity: 1; }
  100% { opacity: 0; transform: translateX(360%); }
}

.anchor-header {
  position: relative;
  z-index: 2;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 3.25rem;
  padding: 0 1rem;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background: linear-gradient(180deg, rgba(21, 32, 55, 0.96), rgba(7, 13, 27, 0.94));
  border-bottom: 1px solid rgba(105, 201, 255, 0.18);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.36), inset 0 1px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  box-sizing: border-box;
  cursor: move;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 28%;
    height: 1px;
    background: linear-gradient(90deg, transparent, #60dfff, #7187ff, transparent);
    filter: drop-shadow(0 0 5px #4ecfff);
    animation: anchor-header-scan 8s ease-in-out infinite;
  }

  .anchor-header-left {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    height: 30px;
    width: 130px;
    padding-left: 11px;
    margin-top: 4px;
    background: linear-gradient(145deg, rgba(74, 123, 196, 0.2), rgba(17, 27, 48, 0.5));
    border: 1px solid rgba(137, 211, 255, 0.2);
    border-radius: 8px;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.1), 0 7px 16px rgba(0, 0, 0, 0.26), 0 0 18px rgba(54, 136, 255, 0.08);
    transform: perspective(500px) rotateY(4deg);
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
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      background: linear-gradient(100deg, #ffffff, #a7e7ff 58%, #b5baff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 8px rgba(92, 198, 255, 0.18));
    }
  }

  .anchor-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 4px;
    -webkit-app-region: no-drag;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    /* 宽度不够时允许横向滚动，避免把其他元素挤变形 */
    overflow-x: auto;
    overflow-y: visible;
    flex-shrink: 1;
    min-width: 0;
    /* 内联元素不换行 */
    flex-wrap: nowrap;
    /* 直接子元素都不要被压缩，保证各自宽度，这样 overflow-x:auto 才会触发滚动条 */
    > * {
      flex-shrink: 0;
    }
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
    color: rgba(235, 244, 255, 0.88);
    cursor: pointer;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.012));
    border: 1px solid rgba(136, 184, 255, 0.09);
    border-radius: 0.375rem;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.045), 0 3px 7px rgba(0, 0, 0, 0.16);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;

    svg {
      width: 0.875rem;
      height: 0.875rem;
      flex: none;
    }

    &:hover {
      color: #dcf8ff;
      background: linear-gradient(180deg, rgba(75, 158, 255, 0.18), rgba(40, 94, 170, 0.08));
      border-color: rgba(101, 215, 255, 0.34);
      box-shadow: inset 0 1px rgba(255, 255, 255, 0.1), 0 7px 16px rgba(24, 119, 213, 0.2);
      transform: translateY(-2px);
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
    background: linear-gradient(180deg, rgba(66, 133, 230, 0.14), rgba(30, 65, 125, 0.06));
    border: 1px solid rgba(110, 186, 255, 0.14);
    border-radius: 0.375rem;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.07), 0 4px 10px rgba(0, 0, 0, 0.18);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

    &:hover {
      background: linear-gradient(180deg, rgba(70, 163, 255, 0.25), rgba(44, 93, 180, 0.12));
      border-color: rgba(105, 220, 255, 0.42);
      box-shadow: 0 7px 18px rgba(36, 135, 229, 0.25), inset 0 1px rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    .start-live-icon {
      width: 1rem;
      height: 1rem;
    }
  }

  .anchor-msg-btn {
    position: relative;
  }
  .anchor-msg-badge {
    position: absolute;
    top: -4px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #ff3b30;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-shadow: 0 0 4px rgba(255, 59, 48, 0.6);
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
  position: relative;
  z-index: 1;
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
  background-color: rgba(12, 19, 33, 0.9);
  border: 1px solid rgba(116, 176, 255, 0.09);
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

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
  background: rgba(2, 2, 10, 0.72);
  backdrop-filter: blur(12px) saturate(0.8);
  animation: logout-mask-fade-in 0.2s ease;
}

.follow-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(1440px, calc(50vw - 3rem));
  height: 80vh;
  max-height: calc(100vh - 3rem);
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 70%, rgba(126, 65, 158, 0.16), transparent 40%),
    radial-gradient(circle at 12% 4%, rgba(225, 126, 165, 0.07), transparent 34%),
    linear-gradient(135deg, rgba(20, 14, 29, 0.97), rgba(6, 12, 23, 0.97));
  border: 1px solid rgba(224, 190, 255, 0.17);
  border-radius: 1.125rem;
  box-shadow:
    0 2rem 6rem rgba(0, 0, 0, 0.58),
    0 0 3rem rgba(145, 85, 196, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  }
}

.follow-gravity-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.follow-panel-header {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.35rem;
  background: linear-gradient(90deg, rgba(19, 15, 29, 0.88), rgba(10, 12, 24, 0.58));
  border-bottom: 1px solid rgba(215, 185, 255, 0.1);
  backdrop-filter: blur(18px);
}

.follow-panel-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #ffffff;
}

.follow-panel-title-orbit {
  position: relative;
  display: block;
  flex-shrink: 0;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid rgba(244, 163, 195, 0.48);
  border-radius: 50%;
  box-shadow: 0 0 1.2rem rgba(224, 116, 171, 0.13), inset 0 0 0.8rem rgba(132, 102, 255, 0.08);
  transform: rotate(-24deg);

  &::before {
    content: '';
    position: absolute;
    inset: 0.42rem;
    border: 1px solid rgba(139, 226, 255, 0.36);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0.77rem;
    background: linear-gradient(135deg, #ffc0d5, #a887ff);
    border-radius: 50%;
    box-shadow: 0 0 0.7rem rgba(255, 145, 190, 0.65);
  }

  > span {
    position: absolute;
    top: 0.25rem;
    right: 0.08rem;
    width: 0.32rem;
    height: 0.32rem;
    background: #8defff;
    border-radius: 50%;
    box-shadow: 0 0 0.55rem #69dff5;
  }
}

.follow-panel-title-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.follow-panel-eyebrow {
  font-size: 0.5625rem;
  font-weight: 500;
  line-height: 1;
  color: rgba(194, 173, 235, 0.64);
  letter-spacing: 0.18em;
}

.follow-panel-heading {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.025em;

  .follow-panel-count {
    padding: 0.2rem 0.48rem;
    font-size: 0.625rem;
    font-weight: 400;
    line-height: 1;
    color: rgba(223, 208, 244, 0.68);
    letter-spacing: 0;
    background: rgba(174, 133, 218, 0.09);
    border: 1px solid rgba(207, 178, 237, 0.1);
    border-radius: 999px;
  }
}

.follow-panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: rgba(236, 225, 246, 0.62);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 50%;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: rgba(225, 142, 183, 0.12);
    border-color: rgba(242, 172, 204, 0.25);
    transform: rotate(90deg);
  }
}

.follow-panel-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.35rem 1.5rem;
  overflow-y: auto;
  scrollbar-color: rgba(190, 150, 220, 0.25) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(190, 150, 220, 0.25);
    border-radius: 999px;
  }
}

.follow-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 45%;
  padding: 4rem 0;
  font-size: 0.8125rem;
  color: rgba(230, 220, 241, 0.58);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);

  p {
    margin: 0;
    word-break: break-all;
  }

  .follow-empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(211, 179, 234, 0.36);
    filter: drop-shadow(0 0 12px rgba(164, 115, 222, 0.18));
  }

  .anchor-retry-btn {
    height: 1.975rem;
    padding: 0 0.9rem;
    font-size: 0.8125rem;
    color: #fff;
    cursor: pointer;
    background: linear-gradient(135deg, rgba(198, 104, 150, 0.86), rgba(119, 86, 177, 0.86));
    border: 1px solid rgba(255, 193, 219, 0.18);
    border-radius: 999px;

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
  gap: 1rem;
  perspective: 1000px;
  transform-style: preserve-3d;
}

.follow-card {
  position: relative;
  flex: 0 0 190px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(155deg, rgba(24, 20, 35, 0.94), rgba(10, 14, 25, 0.92));
  border: 1px solid rgba(221, 197, 240, 0.11);
  border-radius: 0.75rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(14px);
  transform-style: preserve-3d;
  transition: transform 0.28s cubic-bezier(0.2, 0.75, 0.25, 1), border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: rgba(244, 157, 196, 0.42);
    box-shadow:
      0 1.2rem 2.4rem rgba(0, 0, 0, 0.4),
      0 0.5rem 1.6rem rgba(172, 92, 174, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transform: translate3d(0, -6px, 18px);

    .follow-card-video {
      filter: saturate(1.12) brightness(1.06);
      transform: scale(1.055);
    }

    .follow-card-enter {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.follow-card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: radial-gradient(circle at 50% 35%, #211a31, #080a12 72%);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    border-bottom: 1px solid rgba(232, 200, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  }
}

.follow-card-video {
  position: relative;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #080910;
  transition: transform 0.45s cubic-bezier(0.2, 0.7, 0.2, 1), filter 0.35s ease;
}

.follow-card-cover-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(6, 5, 12, 0.3), transparent 36%),
    linear-gradient(0deg, rgba(7, 7, 15, 0.78), transparent 52%);
}

.follow-card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(214, 188, 234, 0.34);
}

.follow-card-live {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.24rem 0.4rem;
  font-size: 0.5625rem;
  font-weight: 600;
  line-height: 1;
  color: #ffd6e5;
  letter-spacing: 0.08em;
  background: rgba(24, 12, 26, 0.62);
  border: 1px solid rgba(255, 176, 207, 0.2);
  border-radius: 0.25rem;
  backdrop-filter: blur(8px);

  > span {
    width: 0.3rem;
    height: 0.3rem;
    background: #ff81ae;
    border-radius: 50%;
    box-shadow: 0 0 0.45rem rgba(255, 105, 161, 0.85);
    animation: follow-live-pulse 1.8s ease-in-out infinite;
  }
}

.follow-card-viewers {
  position: absolute;
  bottom: 0.6rem;
  left: 0.6rem;
  z-index: 2;
  font-size: 0.625rem;
  color: rgba(244, 237, 249, 0.72);
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.8);
}

.follow-card-enter {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.34rem 0.5rem;
  font-size: 0.625rem;
  line-height: 1;
  color: #fff2f8;
  background: linear-gradient(135deg, rgba(194, 101, 147, 0.82), rgba(118, 88, 176, 0.82));
  border: 1px solid rgba(255, 207, 229, 0.18);
  border-radius: 999px;
  box-shadow: 0 0.35rem 1rem rgba(16, 6, 25, 0.28);
  opacity: 0;
  backdrop-filter: blur(8px);
  transform: translateY(5px);
  transition: opacity 0.22s ease, transform 0.25s ease;
}

.follow-card-info {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.7rem 0.75rem;
  background: linear-gradient(90deg, rgba(25, 19, 35, 0.72), rgba(13, 16, 28, 0.6));
}

.follow-card-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  object-fit: cover;
  background: rgba(194, 158, 218, 0.1);
  border: 1px solid rgba(241, 184, 214, 0.2);
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(193, 132, 186, 0.045);

  &.follow-card-avatar-empty {
    display: block;
  }
}

.follow-card-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.2rem;
}

.follow-card-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 250, 255, 0.94);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-card-name {
  font-size: 0.6875rem;
  color: rgba(218, 203, 230, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes follow-live-pulse {
  0%, 100% {
    opacity: 0.55;
    transform: scale(0.82);
  }

  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

/* ============ 充值/认证 二维码弹窗 ============ */
.qr-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.qr-dialog {
  width: 440px;
  background: #101013;
  border: 1px solid #232329;
  border-radius: 12px;
  overflow: hidden;
  color: #fff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.6);
}
.qr-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #232329;
}
.qr-dialog-title { font-size: 16px; font-weight: 600; }
.qr-dialog-env {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: auto;
}
.qr-dialog-close {
  background: none; border: none; color: rgba(255,255,255,0.45); font-size: 22px; cursor: pointer;
  &:hover { color: #fff; }
}
.qr-dialog-body {
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qr-img {
  width: 240px; height: 240px;
  background: #fff;
  border-radius: 8px;
  padding: 8px;
  display: block;
}
.qr-tip { font-size: 13px; color: rgba(255,255,255,0.7); }
.qr-link {
  font-size: 12px; color: rgba(255,255,255,0.35);
  word-break: break-all; text-align: center;
}
</style>

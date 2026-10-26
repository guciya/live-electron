<template>
  <UIKitProvider theme="dark">
    <div class="anchor-center-page">
      <!-- 顶部标题栏 -->
      <header class="anchor-center-header tui-window-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="handleBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="header-title">主播中心</span>
        </div>
        <div class="header-right">
          <button class="anchor-text-btn" type="button" @click="handleStartLive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
            </svg>
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

      <main class="anchor-center-body">
        <!-- Banner 通栏：用户信息 -->
        <section class="user-banner">
          <div class="banner-bg"></div>
          <div class="banner-content">
            <div class="banner-left">
              <span class="avatar-ring">
                <img v-if="userAvatar" class="avatar" :src="userAvatar" alt="" @error="onAvatarError" />
                <span v-else class="avatar avatar-empty">{{ userInitial }}</span>
              </span>
              <div class="user-meta">
                <div class="user-name-row">
                  <span class="user-name">{{ userInfo?.nickname || '主播' }}</span>
                  <span class="level-badge" v-if="userLevel">Lv.{{ userLevel }}</span>
                  <span class="level-badge level-badge--niko">Niko 主播</span>
                </div>
                <div class="user-niko-id">
                  Niko号：<span class="niko-id-text">{{ userShowId || '-' }}</span>
                  <button class="copy-btn" type="button" @click="copyNikoId" title="复制">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制
                  </button>
                </div>
              </div>
            </div>
            <div class="banner-right">
              <div class="banner-stat">
                <span class="banner-stat-label">粉丝总数</span>
                <span class="banner-stat-value">{{ formatNumber(stats.newFollow) }}</span>
              </div>
              <div class="banner-stat-divider"></div>
              <div class="banner-stat">
                <span class="banner-stat-label">累计收入</span>
                <span class="banner-stat-value banner-stat-value--gold">{{ formatNumber(earnings.todayIncome) }}</span>
              </div>
              <button class="banner-start-btn" type="button" @click="handleStartLive">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
                立即开播
              </button>
            </div>
          </div>
        </section>

        <!-- 我的收益（全宽） -->
        <section class="section-card earnings-card">
          <div class="section-header">
            <span class="section-title">
              <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              我的收益
            </span>
          </div>
          <div class="earnings-row">
            <div class="earnings-item">
              <div class="earnings-value">{{ formatNumber(earnings.todayIncome) }}</div>
              <div class="earnings-label">今日收入 (K币)</div>
            </div>
            <div class="earnings-divider"></div>
            <div class="earnings-item">
              <div class="earnings-value">¥ {{ earnings.withdrawable.toFixed(2) }}</div>
              <div class="earnings-label">单日可提现 (元)</div>
            </div>
          </div>
        </section>

        <!-- 今日直播数据（全宽，内部一行 4 项） -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">
              <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 4 4 5-5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              今日直播数据
            </span>
            <button class="section-action" type="button" @click="handlePending('更多数据')">
              更多数据
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon stat-icon--duration">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" stroke-linecap="round" />
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-label">直播时长</div>
                <div class="stat-value">{{ formatDuration(stats.duration) }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon stat-icon--viewer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-label">观众峰值</div>
                <div class="stat-value">{{ formatNumber(stats.viewers) }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon stat-icon--gift">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M12 6v14" />
                  <path d="M12 6h2.5a2.5 2.5 0 0 0 0-5C11 1 12 6 12 6z" />
                  <path d="M12 6H9.5a2.5 2.5 0 0 1 0-5C13 1 12 6 12 6z" />
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-label">送礼人数</div>
                <div class="stat-value">{{ formatNumber(stats.giftCount) }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon stat-icon--follow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <path d="M20 8v6" stroke-linecap="round" />
                  <path d="M23 11h-6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-label">新增关注</div>
                <div class="stat-value">{{ formatNumber(stats.newFollow) }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 成长中心（全宽） -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">
              <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" stroke-linejoin="round" />
              </svg>
              成长中心
            </span>
          </div>
          <div class="entry-grid entry-grid--3">
            <button class="entry-item" type="button" @click="handlePending('任务中心')">
              <div class="entry-icon entry-icon--mission">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <span class="entry-label">任务中心</span>
              <span class="entry-hint">每日任务</span>
            </button>
            <button class="entry-item" type="button" @click="handlePending('贡献榜单')">
              <div class="entry-icon entry-icon--rank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M4 22h16" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <span class="entry-label">贡献榜单</span>
              <span class="entry-hint">粉丝排行</span>
            </button>
            <button class="entry-item" type="button" @click="handlePending('主播等级')">
              <div class="entry-icon entry-icon--level">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 15l-5.5 3 1.6-6.2L2.5 8.5l6.2-.5L12 2.5l3.3 5.5 6.2.5-5.6 3.3L17.5 18z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <span class="entry-label">主播等级</span>
              <span class="entry-hint">等级权益</span>
            </button>
          </div>
        </section>

        <!-- 直播管理（全宽） -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">
              <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              直播管理
            </span>
          </div>
          <div class="entry-grid entry-grid--4">
            <button class="entry-item" type="button" @click="handlePending('直播设置')">
              <div class="entry-icon entry-icon--settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <span class="entry-label">直播设置</span>
            </button>
            <button class="entry-item" type="button" @click="handlePending('付费名单')">
              <div class="entry-icon entry-icon--paid">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <span class="entry-label">付费名单</span>
            </button>
            <button class="entry-item" type="button" @click="handlePending('管理员')">
              <div class="entry-icon entry-icon--admin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span class="entry-label">管理员</span>
            </button>
            <button class="entry-item" type="button" @click="handlePending('平台通知')">
              <div class="entry-icon entry-icon--notice">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <span class="entry-label">平台通知</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../TUILiveKit/common/icons/CloseIcon.vue';
import { showMessage, MessageToastType } from '../TUILiveKit/base-component/MessageToast';
import { resolveImageUrl } from '../niko/config';
import { useAuthStore } from '../niko/store/auth';
import { getAnchorCenter, type AnchorCenterData } from '../niko/api/live';

const router = useRouter();
const authStore = useAuthStore();

// 窗口控制
const isMaximized = ref(false);
function onMinimize() {
  window.ipcRenderer?.send('window-minimize');
}
function onToggleMaximize() {
  window.ipcRenderer?.send('window-toggle-maximize');
}
function onClose() {
  window.ipcRenderer?.send('window-close');
}

// 主播中心真实数据
const anchorData = ref<AnchorCenterData | null>(null);
const anchorLoading = ref(false);
async function loadAnchorCenter() {
  anchorLoading.value = true;
  try {
    const data = await getAnchorCenter();
    anchorData.value = data;
  } catch (e) {
    console.warn('loadAnchorCenter failed', e);
  } finally {
    anchorLoading.value = false;
  }
}

// 用户信息（优先用接口返回，fallback 到 authStore）
const userInfo = computed(() => anchorData.value ?? authStore.userInfo);
const userAvatar = computed(() => {
  const raw = anchorData.value?.avatar || authStore.userInfo?.avatar;
  if (!raw) return '';
  return resolveImageUrl(raw);
});
const userInitial = computed(() => {
  const name = anchorData.value?.nickname || authStore.userInfo?.nickname || String(anchorData.value?.user_show_id || 'A');
  return name.charAt(0).toUpperCase();
});
const userShowId = computed(() => anchorData.value?.user_show_id ?? authStore.userInfo?.userShowId ?? '');

// 等级（从接口取）
const anchorLevelInfo = computed(() => anchorData.value?.anchor_level_info);
const userLevel = computed(() => anchorLevelInfo.value?.current_level_info?.level_name || null);
const levelIcon = computed(() => {
  const icon = anchorLevelInfo.value?.current_level_info?.level_icon;
  return icon ? resolveImageUrl(icon) : '';
});
const levelProgress = computed(() => {
  if (!anchorLevelInfo.value) return 0;
  const cur = anchorLevelInfo.value.current_level_info.experience || 0;
  const next = anchorLevelInfo.value.next_level_info?.experience || cur;
  if (next <= cur) return 100;
  return Math.min(100, Math.round((anchorLevelInfo.value.level_experience || cur) / next * 100));
});

// 收益数据
const earnings = computed(() => ({
  todayIncome: anchorData.value?.live_statistics?.revenue ?? 0,
  withdrawable: Number(anchorData.value?.max_withdraw ?? anchorData.value?.withdraw ?? 0) / 1000, // 接口 K 币转元（假设 1000:1）
}));

// 直播数据
const stats = computed(() => {
  const s = anchorData.value?.live_statistics;
  return {
    duration: s?.live_duration ?? 0,
    viewers: s?.audience_count ?? 0,
    giftCount: s?.consume_audience_count ?? 0,
    newFollow: s?.new_fans_count ?? 0,
  };
});

function onAvatarError() {
  // 头像加载失败不做额外处理，template 会 fallback 到 initial
}

function copyNikoId() {
  const id = userShowId.value;
  if (!id) return;
  navigator.clipboard.writeText(id).then(
    () => showMessage({ type: MessageToastType.Success, message: 'Niko号已复制' }),
    () => showMessage({ type: MessageToastType.Error, message: '复制失败，请手动选择' }),
  );
}

function formatNumber(n: number) {
  if (!n && n !== 0) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}
function formatDuration(seconds: number) {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function handleBack() {
  router.replace({ name: 'anchor-list' });
}

function handleStartLive() {
  router.replace({ name: 'anchor-list' });
  window.ipcRenderer?.send('start-live');
}

const routeMap: Record<string, string> = {
  '更多数据':   'anchor-data-more',
  '任务中心':   'anchor-task-center',
  '贡献榜单':   'anchor-contribution-rank',
  '主播等级':   'anchor-level',
  '直播设置':   'anchor-live-settings',
  '付费名单':   'anchor-paid-list',
  '管理员':     'anchor-admin-list',
  '平台通知':   'anchor-notice',
};

function handlePending(feature: string) {
  const name = routeMap[feature];
  if (name) {
    router.push({ name });
  } else {
    showMessage({ type: MessageToastType.Info, message: `${feature} 功能暂未开放` });
  }
}

onMounted(() => {
  // 恢复窗口最大化状态（与 AnchorList 保持一致）
  window.ipcRenderer?.invoke?.('window-is-maximized').then((v) => {
    isMaximized.value = Boolean(v);
  }).catch(() => undefined);
  loadAnchorCenter();
});

onBeforeUnmount(() => {
  // 清理
});
</script>

<style scoped>
/* ==================== 基础 ==================== */
.anchor-center-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: #0a0a10;
  color: #e6e6ea;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}

/* ==================== 顶部标题栏 ==================== */
.anchor-center-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 10px 0 0;
  background: rgba(20, 20, 28, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.anchor-center-header .header-left,
.anchor-center-header .header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
}
.header-right .anchor-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  height: 30px;
  border: none;
  background: linear-gradient(90deg, rgba(139,92,246,0.2), rgba(244,114,182,0.2));
  color: #d4c8ff;
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}
.header-right .anchor-text-btn:hover { background: linear-gradient(90deg, rgba(139,92,246,0.35), rgba(244,114,182,0.35)); color: #fff; }
.header-right .anchor-text-btn svg { width: 14px; height: 14px; }

.window-tool { display: flex; align-items: center; }
.window-tool-btn {
  width: 34px; height: 28px;
  border: none; background: transparent;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* ==================== 主体布局 ==================== */
.anchor-center-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px 28px 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

/* ==================== Banner 通栏 ==================== */
.user-banner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(139,92,246,0.18);
  flex-shrink: 0;
}
.banner-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(600px 200px at 10% 0%, rgba(139,92,246,0.35), transparent 60%),
    radial-gradient(500px 200px at 90% 100%, rgba(244,114,182,0.25), transparent 60%),
    linear-gradient(135deg, #1a1033 0%, #241644 50%, #2d1a4d 100%);
}
.banner-bg::after {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.03) 1px, transparent 1px),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 40px 40px, 60px 60px;
}
.banner-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 28px;
}
.banner-left {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}
.banner-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

/* 头像 */
.avatar-ring {
  width: 64px; height: 64px;
  border-radius: 50%;
  padding: 2.5px;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(167,139,250,0.3);
}
.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: #222;
  object-fit: cover;
  display: block;
  border: 2px solid #1a1033;
}
.avatar-empty {
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 26px;
  background: linear-gradient(135deg, #6b46c1, #c026d3);
}

/* 用户 meta */
.user-meta { min-width: 0; }
.user-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.user-name {
  font-size: 20px; font-weight: 700;
  background: linear-gradient(90deg, #ffffff, #e9d5ff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
}
.level-badge {
  display: inline-flex; align-items: center;
  height: 20px; padding: 0 10px;
  font-size: 11px; font-weight: 600;
  color: #ffd36b;
  background: rgba(255,211,107,0.12);
  border: 1px solid rgba(255,211,107,0.35);
  border-radius: 10px;
  letter-spacing: 0.5px;
}
.level-badge--niko {
  color: #d4c8ff;
  background: rgba(139,92,246,0.18);
  border-color: rgba(167,139,250,0.35);
}
.user-niko-id {
  font-size: 12px; color: rgba(255,255,255,0.55);
  display: flex; align-items: center; gap: 8px;
}
.niko-id-text {
  font-family: "JetBrains Mono", "Consolas", monospace;
  color: rgba(255,255,255,0.85);
}
.copy-btn {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  padding: 3px 10px; border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.copy-btn svg { width: 12px; height: 12px; }
.copy-btn:hover { background: rgba(139,123,230,0.25); color: #fff; }

/* Banner 右侧统计 */
.banner-stat {
  display: flex; flex-direction: column; align-items: center;
  min-width: 80px;
}
.banner-stat-label {
  font-size: 11px; color: rgba(255,255,255,0.45);
  margin-bottom: 4px;
}
.banner-stat-value {
  font-size: 22px; font-weight: 700; color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.banner-stat-value--gold { color: #ffd36b; }
.banner-stat-divider {
  width: 1px; height: 36px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent);
}
.banner-start-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 40px; padding: 0 20px;
  border: none; border-radius: 20px;
  background: linear-gradient(90deg, #ec4899, #8b5cf6);
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  transition: transform 0.12s, box-shadow 0.2s;
}
.banner-start-btn svg { width: 12px; height: 12px; }
.banner-start-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(139,92,246,0.5), 0 0 0 1px rgba(255,255,255,0.08);
}

/* ==================== 通用卡片 ==================== */
.section-card {
  background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 20px 22px;
  transition: border-color 0.2s, transform 0.2s;
}
.section-card:hover {
  border-color: rgba(139,92,246,0.2);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-title {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f4;
  letter-spacing: 0.3px;
}
.title-icon {
  width: 18px; height: 18px;
  color: #b39fff;
}
.section-action {
  display: inline-flex; align-items: center;
  border: none; background: transparent;
  color: #8b7be6; font-size: 12px;
  cursor: pointer;
  padding: 4px 10px; border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.section-action:hover { color: #d4c8ff; background: rgba(139, 123, 230, 0.1); }
.section-action .chevron { width: 12px; height: 12px; margin-left: 2px; }

/* ==================== 收益卡 ==================== */
.earnings-card { }
.earnings-row {
  display: flex; align-items: center; gap: 20px;
  margin-top: 8px;
}
.earnings-item { flex: 1; min-width: 0; }
.earnings-divider {
  width: 1px; height: 40px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent);
  flex-shrink: 0;
}
.earnings-value {
  font-size: 26px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.earnings-item:last-of-type .earnings-value {
  background: linear-gradient(90deg, #f472b6, #ec4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.earnings-label {
  font-size: 12px; color: rgba(255,255,255,0.45);
  margin-top: 4px;
}
/* ==================== 数据统计 ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.stat-item {
  display: flex; align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  transition: background 0.15s, border-color 0.15s;
  min-width: 0;
}
.stat-item:hover {
  background: rgba(139,123,230,0.08);
  border-color: rgba(139,123,230,0.18);
}
.stat-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon svg { width: 18px; height: 18px; }
.stat-icon--duration  { background: rgba(59,130,246,0.15); color: #60a5fa; }
.stat-icon--viewer   { background: rgba(34,197,94,0.15);   color: #4ade80; }
.stat-icon--gift     { background: rgba(244,114,182,0.15); color: #f472b6; }
.stat-icon--follow   { background: rgba(251,191,36,0.15);  color: #fbbf24; }
.stat-info { flex: 1; min-width: 0; }
.stat-value {
  font-size: 18px; font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.stat-label { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 2px; }

/* ==================== 入口网格 ==================== */
.entry-grid { display: grid; gap: 10px; }
.entry-grid--3 { grid-template-columns: repeat(3, 1fr); }
.entry-grid--4 { grid-template-columns: repeat(4, 1fr); }

.entry-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  padding: 18px 6px 16px;
  border: none; border-radius: 12px;
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  transition: background 0.18s, transform 0.12s, box-shadow 0.18s, border-color 0.18s;
  border: 1px solid rgba(255,255,255,0.04);
}
.entry-item:hover {
  background: rgba(139,123,230,0.1);
  border-color: rgba(139,123,230,0.22);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139,92,246,0.15);
}

.entry-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.entry-icon svg { width: 22px; height: 22px; }
.entry-icon--mission { background: rgba(244,114,182,0.16); color: #f472b6; }
.entry-icon--rank    { background: rgba(251,191,36,0.16);  color: #fbbf24; }
.entry-icon--level   { background: rgba(139,123,230,0.16);color: #b39fff; }
.entry-icon--settings{ background: rgba(59,130,246,0.16); color: #60a5fa; }
.entry-icon--paid    { background: rgba(34,197,94,0.16);   color: #4ade80; }
.entry-icon--admin   { background: rgba(248,113,113,0.16);color: #f87171; }
.entry-icon--notice  { background: rgba(251,191,36,0.16);  color: #fbbf24; }

.entry-label { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500; }
.entry-hint { font-size: 10px; color: rgba(255,255,255,0.32); letter-spacing: 0.5px; }

/* ==================== 滚动条 ==================== */
.anchor-center-body::-webkit-scrollbar { width: 6px; }
.anchor-center-body::-webkit-scrollbar-track { background: transparent; }
.anchor-center-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08); border-radius: 3px;
}
.anchor-center-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }

/* ==================== 响应式 ==================== */
@media (max-width: 900px) {
  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 18px 20px;
  }
  .banner-right {
    width: 100%;
    justify-content: space-between;
  }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .entry-grid--4 { grid-template-columns: repeat(2, 1fr); }
}
</style>

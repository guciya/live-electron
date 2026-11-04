<template>
  <UIKitProvider theme="dark">
    <div class="anchor-center-page">
      <canvas ref="holoCanvas" class="holo-canvas" aria-hidden="true"></canvas>
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
import * as THREE from 'three/src/Three.js';

const router = useRouter();
const authStore = useAuthStore();
const holoCanvas = ref<HTMLCanvasElement | null>(null);
let cleanupHologram: (() => void) | null = null;

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

function createHologramScene(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.warn('[AnchorCenter] WebGL initialization failed', error);
    return null;
  }

  renderer.setClearColor(0x03050d, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070914, 0.038);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
  camera.position.set(0, 0.25, 11);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.AmbientLight(0x7685d8, 1.35));

  const starCount = 860;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const violet = new THREE.Color(0x7567e8);
  const cyan = new THREE.Color(0x71e7ff);
  for (let i = 0; i < starCount; i += 1) {
    starPositions[i * 3] = (Math.random() - 0.5) * 30;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    starPositions[i * 3 + 2] = -18 + Math.random() * 20;
    const color = violet.clone().lerp(cyan, Math.random());
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  world.add(stars);

  const grid = new THREE.GridHelper(46, 46, 0x4053a0, 0x17243f);
  grid.position.set(0, -3.55, -5);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.18;
  gridMaterial.depthWrite = false;
  world.add(grid);

  const coreGroup = new THREE.Group();
  world.add(coreGroup);
  const coreLight = new THREE.PointLight(0x55dfff, 22, 13, 2);
  coreLight.position.set(1.2, 1.1, 2.2);
  coreGroup.add(coreLight);
  const rimLight = new THREE.PointLight(0x8a5cff, 18, 12, 2);
  rimLight.position.set(-1.5, -0.6, 1.2);
  coreGroup.add(rimLight);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  if (glowContext) {
    const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(150, 240, 255, 0.9)');
    gradient.addColorStop(0.18, 'rgba(92, 140, 255, 0.48)');
    gradient.addColorStop(0.48, 'rgba(111, 68, 255, 0.16)');
    gradient.addColorStop(1, 'rgba(61, 39, 180, 0)');
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 128, 128);
  }
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xb3c5ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(4.8, 4.8, 1);
  glow.position.z = -0.8;
  coreGroup.add(glow);

  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7566ed,
    emissive: 0x251b64,
    emissiveIntensity: 0.55,
    metalness: 0.28,
    roughness: 0.16,
    transmission: 0.18,
    thickness: 0.75,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
    flatShading: true,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.02, 1), crystalMaterial);
  crystal.scale.set(0.82, 1.25, 0.82);
  coreGroup.add(crystal);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x9cf5ff,
    emissive: 0x39cdea,
    emissiveIntensity: 1.8,
    metalness: 0.35,
    roughness: 0.18,
    transparent: true,
    opacity: 0.88,
  });
  const innerCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 2), coreMaterial);
  coreGroup.add(innerCore);

  const wireSourceGeometry = new THREE.IcosahedronGeometry(1.28, 1);
  const wireGeometry = new THREE.EdgesGeometry(wireSourceGeometry);
  wireSourceGeometry.dispose();
  const wire = new THREE.LineSegments(
    wireGeometry,
    new THREE.LineBasicMaterial({
      color: 0xaaa0ff,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  coreGroup.add(wire);

  const ringSpecs = [
    { radius: 1.52, color: 0x62e7ff, opacity: 0.5, rotation: [1.12, 0.18, 0.2], speed: 0.11 },
    { radius: 1.88, color: 0x8c78ff, opacity: 0.34, rotation: [0.62, 0.92, 1.1], speed: -0.075 },
    { radius: 2.24, color: 0x4f8fff, opacity: 0.2, rotation: [1.42, -0.4, 2.1], speed: 0.045 },
  ];
  const orbitGroups: THREE.Group[] = [];
  ringSpecs.forEach((spec, index) => {
    const orbit = new THREE.Group();
    orbit.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, index === 0 ? 0.012 : 0.008, 6, 160),
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: spec.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orbit.add(ring);
    const satellite = new THREE.Mesh(
      new THREE.SphereGeometry(index === 0 ? 0.055 : 0.038, 12, 12),
      new THREE.MeshBasicMaterial({ color: spec.color, blending: THREE.AdditiveBlending }),
    );
    satellite.position.set(spec.radius, 0, 0);
    orbit.add(satellite);
    coreGroup.add(orbit);
    orbitGroups.push(orbit);
  });

  const dustCount = 160;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.85 + Math.random() * 2.15;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
    dustPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.65;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0x88dcff,
      size: 0.035,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  coreGroup.add(dust);

  // 左侧伴生星体：与主核心形成左右呼应，填补画面左下方的空白
  const miniGroup = new THREE.Group();
  world.add(miniGroup);
  const miniShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({
      color: 0x6fb7ff,
      emissive: 0x1c4bd8,
      emissiveIntensity: 1.1,
      metalness: 0.4,
      roughness: 0.24,
      transparent: true,
      opacity: 0.34,
      flatShading: true,
      depthWrite: false,
    }),
  );
  miniGroup.add(miniShell);
  const miniWireSource = new THREE.IcosahedronGeometry(0.68, 1);
  const miniWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(miniWireSource),
    new THREE.LineBasicMaterial({
      color: 0x9ed8ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  miniWireSource.dispose();
  miniGroup.add(miniWire);
  const miniRingA = new THREE.Mesh(
    new THREE.TorusGeometry(0.94, 0.01, 6, 96),
    new THREE.MeshBasicMaterial({
      color: 0x6fe4ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  miniRingA.rotation.set(1.1, 0.2, 0);
  miniGroup.add(miniRingA);
  const miniRingB = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.008, 6, 96),
    new THREE.MeshBasicMaterial({
      color: 0x8f7bff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  miniRingB.rotation.set(0.6, 1.05, 0.4);
  miniGroup.add(miniRingB);

  // 远景漂浮线框碎片，增加纵深，避免大面积纯色空白
  const shardPositions: [number, number, number][] = [
    [-0.42, 0.3, -8],
    [0.4, 0.34, -10],
    [-0.3, -0.26, -7.5],
    [0.46, -0.2, -11],
    [-0.16, 0.12, -13],
    [0.22, -0.34, -9],
  ];
  const shardMaterialA = new THREE.MeshBasicMaterial({
    color: 0x7fa8ff,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shardMaterialB = new THREE.MeshBasicMaterial({
    color: 0xa98cff,
    transparent: true,
    opacity: 0.16,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shards = shardPositions.map(([nx, ny, z], index) => {
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.26 + (index % 3) * 0.12, 0),
      index % 2 ? shardMaterialB : shardMaterialA,
    );
    shard.position.set(nx, ny, z);
    shard.rotation.set(index * 0.7, index * 0.4, index * 0.9);
    world.add(shard);
    return { shard, nx, ny, speed: 0.12 + index * 0.03, phase: index * 0.8 };
  });

  // 底部流动数据带：粒子沿横向正弦轨迹移动，并会轻微跟随鼠标偏移
  const streamCount = 120;
  const streamPositions = new Float32Array(streamCount * 3);
  const streamOffsets = new Float32Array(streamCount);
  const streamLanes = new Float32Array(streamCount);
  for (let i = 0; i < streamCount; i += 1) {
    streamOffsets[i] = Math.random();
    streamLanes[i] = Math.random();
  }
  const streamGeometry = new THREE.BufferGeometry();
  const streamAttribute = new THREE.BufferAttribute(streamPositions, 3);
  streamAttribute.setUsage(THREE.DynamicDrawUsage);
  streamGeometry.setAttribute('position', streamAttribute);
  const streamMaterial = new THREE.PointsMaterial({
    size: 0.04,
    color: 0x7fe3ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stream = new THREE.Points(streamGeometry, streamMaterial);
  world.add(stream);

  // 鼠标光晕：跟随指针在场景中的投影位置
  const cursorHaloMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x9fe8ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const cursorHalo = new THREE.Sprite(cursorHaloMaterial);
  cursorHalo.scale.set(2.4, 2.4, 1);
  cursorHalo.position.z = -2;
  world.add(cursorHalo);

  // 背景点击涟漪：仅在非交互区域触发
  const ripples = Array.from({ length: 3 }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: 0x8fe6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 6, 96), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -3.3, -3);
    world.add(mesh);
    return { mesh, material, startedAt: -10 };
  });
  let rippleIndex = 0;

  const pointerTarget = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const handlePointerMove = (event: PointerEvent) => {
    pointerTarget.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
    pointerTarget.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  };
  const resetPointer = () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  };
  let rippleClock = 0;
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('button, a, input, select, textarea, [role="button"], .section-action')) return;
    const ripple = ripples[rippleIndex];
    rippleIndex = (rippleIndex + 1) % ripples.length;
    ripple.mesh.position.x = pointer.x * viewWidth * 0.34;
    ripple.mesh.position.z = -3 - pointer.y * 2.4;
    ripple.startedAt = rippleClock;
  };
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('blur', resetPointer);

  let coreBaseX = 0;
  let coreBaseY = 0;
  let miniBaseX = 0;
  let miniBaseY = 0;
  let viewWidth = 1;
  let viewHeight = 1;
  const resize = () => {
    const host = canvas.parentElement;
    const width = Math.max(host?.clientWidth || window.innerWidth, 1);
    const height = Math.max(host?.clientHeight || window.innerHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
    const visibleWidth = visibleHeight * camera.aspect;
    viewWidth = visibleWidth;
    viewHeight = visibleHeight;
    coreBaseX = visibleWidth * (width < 900 ? 0.4 : 0.31);
    coreBaseY = visibleHeight * (width < 900 ? 0.35 : 0.31);
    coreGroup.scale.setScalar(width < 700 ? 0.58 : width < 1100 ? 0.72 : 0.88);
    miniBaseX = -visibleWidth * (width < 900 ? 0.3 : 0.28);
    miniBaseY = -visibleHeight * 0.24;
    miniGroup.position.set(miniBaseX, miniBaseY, -2.6);
    miniGroup.scale.setScalar(width < 700 ? 0.6 : width < 1100 ? 0.8 : 0.95);
    shards.forEach(({ shard, nx, ny }) => {
      shard.position.x = nx * visibleWidth;
      shard.position.y = ny * visibleHeight;
    });
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement || canvas);
  resize();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionScale = reducedMotion ? 0.25 : 1;
  const frameInterval = 1000 / 30;
  let lastFrameTime = 0;
  let raf = 0;
  let disposed = false;
  const animate = (time: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    const elapsed = time - lastFrameTime;
    if (elapsed < frameInterval) return;
    lastFrameTime = time - (elapsed % frameInterval);
    const t = time * 0.001 * motionScale;

    pointer.x += (pointerTarget.x - pointer.x) * 0.045;
    pointer.y += (pointerTarget.y - pointer.y) * 0.045;
    coreGroup.position.set(
      coreBaseX + pointer.x * 0.4,
      coreBaseY + Math.sin(t * 0.72) * 0.11 - pointer.y * 0.26,
      0,
    );
    coreGroup.rotation.y = t * 0.075 + pointer.x * 0.055;
    coreGroup.rotation.x = Math.sin(t * 0.24) * 0.035 - pointer.y * 0.025;
    crystal.rotation.x = t * 0.17;
    crystal.rotation.y = t * 0.25;
    wire.rotation.x = -t * 0.09;
    wire.rotation.y = t * 0.13;
    innerCore.rotation.x = -t * 0.22;
    innerCore.rotation.y = t * 0.32;
    innerCore.scale.setScalar(1 + Math.sin(t * 1.65) * 0.075);
    coreMaterial.emissiveIntensity = 1.75 + Math.sin(t * 1.65) * 0.42;
    crystalMaterial.emissiveIntensity = 0.52 + Math.sin(t * 1.65) * 0.12;
    glowMaterial.opacity = 0.27 + Math.sin(t * 1.65) * 0.055;
    const glowScale = 4.75 + Math.sin(t * 1.65) * 0.24;
    glow.scale.set(glowScale, glowScale, 1);
    orbitGroups.forEach((orbit, index) => {
      orbit.rotation.z = ringSpecs[index].rotation[2] + t * ringSpecs[index].speed;
    });
    dust.rotation.y = -t * 0.085;
    dust.rotation.z = t * 0.025;
    stars.rotation.y = t * 0.004;
    stars.position.y = Math.sin(t * 0.15) * 0.06;
    starMaterial.opacity = 0.54 + Math.sin(t * 0.4) * 0.06;
    grid.position.z = -5 + (t * 0.08) % 1;

    // 伴生星体：自转 + 跟随鼠标倾斜
    miniGroup.position.y = miniBaseY + Math.sin(t * 0.8) * 0.12;
    miniGroup.rotation.y = -t * 0.22 + pointer.x * 0.3;
    miniGroup.rotation.x = Math.sin(t * 0.3) * 0.12 - pointer.y * 0.12;
    miniShell.rotation.y = t * 0.3;
    miniShell.rotation.x = -t * 0.18;
    miniWire.rotation.y = -t * 0.16;
    miniRingA.rotation.z = t * 0.2;
    miniRingB.rotation.z = -t * 0.14;

    // 远景碎片：缓慢漂浮旋转
    shards.forEach(({ shard, nx, ny, speed, phase }, index) => {
      shard.position.x = nx * viewWidth + pointer.x * 0.08 * (index % 2 ? 1 : -1);
      shard.position.y = ny * viewHeight + Math.sin(t * 0.55 + phase) * 0.12;
      shard.rotation.x = phase + t * speed * 2;
      shard.rotation.y = phase * 0.6 + t * speed * 1.4;
    });

    // 底部数据流：粒子横向流动并随鼠标偏移
    rippleClock = t;
    for (let i = 0; i < streamCount; i += 1) {
      const progress = (t * 0.06 + streamOffsets[i]) % 1;
      const offset = i * 3;
      streamPositions[offset] = (progress - 0.5) * viewWidth * 1.3 + pointer.x * viewWidth * 0.04;
      streamPositions[offset + 1] = -viewHeight * 0.34
        + Math.sin(progress * Math.PI * 3.2 + t * 0.6 + i * 0.06) * 0.22
        + streamLanes[i] * 0.7
        - pointer.y * 0.1;
      streamPositions[offset + 2] = -4.4 - streamLanes[i] * 2.4;
    }
    streamAttribute.needsUpdate = true;

    // 鼠标光晕与点击涟漪
    cursorHalo.position.x = pointer.x * viewWidth * 0.4;
    cursorHalo.position.y = -pointer.y * viewHeight * 0.36;
    cursorHaloMaterial.opacity = 0.14 + Math.sin(t * 2.1) * 0.05;
    const haloScale = 2.2 + Math.sin(t * 1.6) * 0.25;
    cursorHalo.scale.set(haloScale, haloScale, 1);
    ripples.forEach((ripple) => {
      const age = t - ripple.startedAt;
      if (age < 0 || age > 1.1) {
        ripple.material.opacity = 0;
        return;
      }
      const progress = age / 1.1;
      ripple.mesh.scale.setScalar(0.35 + progress * 4.4);
      ripple.material.opacity = 0.5 * (1 - progress);
    });

    camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.04;
    camera.position.y += (0.25 - pointer.y * 0.16 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.2, -2);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('blur', resetPointer);
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
    glowTexture.dispose();
    renderer.dispose();
  };
}

onMounted(() => {
  // 恢复窗口最大化状态（与 AnchorList 保持一致）
  window.ipcRenderer?.invoke?.('window-is-maximized').then((v) => {
    isMaximized.value = Boolean(v);
  }).catch(() => undefined);
  loadAnchorCenter();
  if (holoCanvas.value) {
    cleanupHologram = createHologramScene(holoCanvas.value);
  }
});

onBeforeUnmount(() => {
  cleanupHologram?.();
  cleanupHologram = null;
});
</script>

<style scoped>
/* ==================== 基础 ==================== */
.anchor-center-page {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background:
    radial-gradient(900px 560px at 90% -10%, rgba(79, 64, 170, 0.2), transparent 70%),
    radial-gradient(700px 500px at -10% 90%, rgba(21, 112, 148, 0.12), transparent 70%),
    #050711;
  color: #e6e6ea;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}
.holo-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ==================== 顶部标题栏 ==================== */
.anchor-center-header {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 10px 0 0;
  background: rgba(7, 9, 19, 0.8);
  backdrop-filter: blur(18px) saturate(125%);
  border-bottom: 1px solid rgba(147, 160, 224, 0.1);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
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
  position: relative;
  z-index: 1;
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
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(149, 154, 255, 0.24);
  background: rgba(12, 15, 34, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 20px 60px rgba(2, 4, 18, 0.36),
    0 0 42px rgba(91, 74, 190, 0.08);
  backdrop-filter: blur(20px) saturate(130%);
  flex-shrink: 0;
}
.banner-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(620px 240px at 6% 0%, rgba(120, 87, 255, 0.3), transparent 65%),
    radial-gradient(560px 260px at 92% 45%, rgba(39, 190, 230, 0.15), transparent 68%),
    linear-gradient(120deg, rgba(29, 21, 62, 0.72), rgba(15, 19, 45, 0.6) 54%, rgba(8, 25, 43, 0.66));
}
.banner-bg::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.075), transparent 25%, transparent 72%, rgba(105, 227, 255, 0.045));
  pointer-events: none;
}
.banner-bg::after {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(150, 166, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(150, 166, 255, 0.035) 1px, transparent 1px);
  background-size: 36px 36px;
  -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.8), transparent 78%);
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.8), transparent 78%);
  pointer-events: none;
}
.banner-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 30px;
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
  width: 72px; height: 72px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(from 210deg, #62e7ff, #7770ff, #c084fc, #62e7ff);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow:
    0 8px 28px rgba(78, 73, 190, 0.34),
    0 0 24px rgba(79, 209, 238, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: #222;
  object-fit: cover;
  display: block;
  border: 2px solid #11152c;
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
  font-size: 22px; font-weight: 700;
  background: linear-gradient(90deg, #ffffff, #dcd8ff 62%, #b9efff);
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
  font-size: 11px; color: rgba(229, 233, 255, 0.6);
  margin-bottom: 4px;
}
.banner-stat-value {
  font-size: 23px; font-weight: 700; color: #fff;
  text-shadow: 0 2px 14px rgba(134, 160, 255, 0.16);
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
  background: linear-gradient(100deg, #7657e8, #436fd8 58%, #219dbf);
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 7px 24px rgba(75, 84, 205, 0.36),
    0 0 0 1px rgba(173, 209, 255, 0.1);
  transition: transform 0.18s, box-shadow 0.22s, filter 0.22s;
}
.banner-start-btn svg { width: 12px; height: 12px; }
.banner-start-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 10px 28px rgba(75, 84, 205, 0.46),
    0 0 24px rgba(59, 196, 224, 0.12);
}

/* ==================== 通用卡片 ==================== */
.section-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.035), transparent 28%),
    linear-gradient(155deg, rgba(22, 25, 46, 0.86), rgba(9, 13, 27, 0.8));
  border: 1px solid rgba(154, 166, 226, 0.12);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 12px 36px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(18px) saturate(125%);
  transition: border-color 0.22s, box-shadow 0.22s;
}
.section-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(181, 196, 255, 0.2), transparent);
  pointer-events: none;
}
.section-card:hover {
  border-color: rgba(133, 137, 234, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.24),
    0 0 28px rgba(88, 94, 201, 0.04);
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
  color: #9baaff;
  filter: drop-shadow(0 0 7px rgba(104, 169, 255, 0.18));
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
  background: linear-gradient(145deg, rgba(112, 126, 190, 0.055), rgba(26, 31, 54, 0.08));
  border: 1px solid rgba(169, 182, 236, 0.075);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
  min-width: 0;
}
.stat-item:hover {
  background: linear-gradient(145deg, rgba(112, 107, 208, 0.1), rgba(38, 118, 151, 0.055));
  border-color: rgba(126, 174, 235, 0.17);
  transform: translateY(-1px);
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
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  padding: 18px 6px 16px;
  border: 1px solid rgba(164, 178, 232, 0.075); border-radius: 12px;
  background: linear-gradient(145deg, rgba(115, 125, 189, 0.055), rgba(22, 27, 50, 0.1));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: background 0.22s, transform 0.22s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.22s, border-color 0.22s;
}
.entry-item:hover {
  background: linear-gradient(145deg, rgba(125, 111, 224, 0.13), rgba(36, 130, 158, 0.07));
  border-color: rgba(137, 161, 242, 0.24);
  transform: perspective(650px) translateY(-4px) rotateX(1.2deg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.065),
    0 12px 24px rgba(0, 0, 0, 0.26),
    0 0 24px rgba(89, 100, 220, 0.1);
}
.entry-item:focus-visible {
  outline: 2px solid rgba(110, 220, 255, 0.65);
  outline-offset: 2px;
}

.entry-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: transform 0.22s, box-shadow 0.22s;
}
.entry-item:hover .entry-icon {
  transform: translateZ(12px) scale(1.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 6px 16px rgba(42, 45, 105, 0.16);
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
@media (prefers-reduced-motion: reduce) {
  .entry-item,
  .entry-icon,
  .stat-item,
  .banner-start-btn { transition-duration: 0.01ms; }
  .entry-item:hover,
  .stat-item:hover,
  .banner-start-btn:hover { transform: none; }
}
</style>

<template>
  <UIKitProvider theme="dark">
    <div class="live-player-page">
      <header class="player-header tui-window-header">
        <div class="player-header-left">
          <button class="player-back" type="button" aria-label="返回" @click="handleBack">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="player-title">{{ title || '直播间' }}</span>
        </div>
        <div class="player-header-right">
          <span class="player-viewers">{{ audienceCountText }} 人观看</span>
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

      <main class="player-body">
        <div ref="playerStageEl" class="player-stage">
          <canvas ref="signalCanvasEl" class="player-signal-scene" aria-hidden="true"></canvas>
          <video ref="videoEl" class="player-video" autoplay playsinline></video>

          <!-- 独立 TRTC 连麦宫格：主播主画面 + 连麦观众小图，叠在 FLV 主画面之上 -->
          <CoGuestGrid
            v-if="trtcReady && (guestUsers.length > 0 || trtcAnchorUserId)"
            ref="coGuestGridRef"
            :anchor-user-id="trtcAnchorUserId || ''"
            :anchor-name="anchorName"
            :guest-users="guestUsers"
            @video-ready="onCoGuestVideoReady"
            @video-remove="onCoGuestVideoRemove"
          />

          <GiftEffect />

          <!-- IM 飘屏消息（message_action=1001 / 进房 / 礼物） -->
          <LiveMarquee />

          <div v-if="errorText" class="player-status">{{ errorText }}</div>

          <div class="player-anchor">
            <div class="player-anchor-side">
              <div class="player-avatar-wrap is-clickable" @click.stop="handleAnchorClick">
                <img
                  v-if="avatar && !avatarError"
                  class="player-avatar"
                  :src="avatar"
                  alt=""
                  @error="avatarError = true"
                />
                <span v-else class="player-avatar player-avatar-empty">{{ initial }}</span>
                <!-- 直播中：压在头像底部 -->
                <span class="player-live-badge">直播中</span>
              </div>
              <!-- 人气榜：头像下方的榜单入口 -->
              <button
                class="player-popularity"
                type="button"
                @click.stop="popularityPanelVisible = true"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
                  <rect x="3" y="12" width="4" height="9" rx="1" />
                  <rect x="10" y="7" width="4" height="14" rx="1" />
                  <rect x="17" y="3" width="4" height="18" rx="1" />
                </svg>
                <span>人气榜</span>
              </button>
            </div>
            <div class="player-anchor-info is-clickable" @click.stop="handleAnchorClick">
              <span class="player-anchor-name">{{ anchorName || '主播' }}</span>
              <span class="player-anchor-sub">{{ title }}</span>
            </div>
            <button
              v-if="canFollow"
              class="player-follow-btn"
              :class="{ 'is-followed': following }"
              type="button"
              :disabled="followLoading"
              @click.stop="handleToggleFollow"
            >{{ following ? '已关注' : '关注' }}</button>
          </div>

          <!-- 在线观众折叠组件 + 声音开关（视频右上角，同一行），下方为更多直播入口 -->
          <div class="player-top-right">
            <div class="player-top-right-row">
              <!-- 人气榜入口：喇叭最左侧 -->
              <button
                class="player-rank-btn"
                type="button"
                title="人气榜"
                aria-label="人气榜"
                @click.stop="popularityPanelVisible = true"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.5A6.5 6.5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A6.5 6.5 0 0 1 7.5 12H7a4 4 0 0 1-4-4V5h3V3zm0 4H5v1a2 2 0 0 0 1.2 1.8A6.6 6.6 0 0 1 6 7zm12 0a6.6 6.6 0 0 1-.2 1.8A2 2 0 0 0 19 7V7h-1z" />
                </svg>
                <span>人气榜</span>
              </button>

              <!-- 声音开关：点击切换静音/开启，图标随状态变化 -->
              <button
                class="player-sound-btn"
                type="button"
                :title="muted ? '开启声音' : '关闭声音'"
                :aria-label="muted ? '开启声音' : '关闭声音'"
                @click="toggleSound"
              >
              <!-- 有声状态 -->
              <template v-if="!muted">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </template>
              <!-- 静音状态 -->
              <template v-else>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </template>
            </button>

            <div class="player-audience">
              <button
                class="player-audience-toggle"
                type="button"
                @click="audiencePanelVisible = !audiencePanelVisible"
              >
                <span class="player-audience-avatars">
                  <template v-for="(member, idx) in audiencePreview" :key="member.userId || idx">
                    <img
                      v-if="member.avatar"
                      class="player-audience-avatar"
                      :src="member.avatar"
                      :style="{ zIndex: audiencePreview.length - idx }"
                      alt=""
                    />
                    <span
                      v-else
                      class="player-audience-avatar player-audience-avatar-initial"
                      :style="{ zIndex: audiencePreview.length - idx }"
                    >{{ (member.nickname || 'N').slice(0, 1).toUpperCase() }}</span>
                  </template>
                </span>
                <span class="player-audience-count">{{ audienceCountText }}人</span>
              </button>
              <AudiencePanel
                :visible="audiencePanelVisible"
                :live-index-id="liveIndexIdNumber"
                @click.stop
                @user-click="handleUserClick"
              />
            </div>
            </div>

            <!-- 更多直播：在线观众下方的直播列表入口 -->
            <div class="player-more-live">
              <button
                class="player-more-live-btn"
                type="button"
                @click="toggleMoreLive"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M8 21h8M12 18v3" />
                </svg>
                <span>更多直播</span>
              </button>
            </div>
          </div>

          <MoreLiveTray
            :visible="moreLiveVisible"
            :current-live-index-id="liveIndexId"
            @close="moreLiveVisible = false"
            @select="enterOtherLive"
          />
        </div>

        <aside class="player-side">
          <LiveChatPanel
            v-if="imReady"
            :room-id="roomId"
            :live-index-id="liveIndexId"
            :welcome-name="anchorName"
            show-gift-button
            @open-gift="giftPanelVisible = true"
            @open-game="gamePanelVisible = true"
            @user-click="handleUserClick"
          />
          <div v-else class="player-side-hint">{{ chatHint }}</div>
        </aside>
      </main>

      <GiftPanel
        :visible="giftPanelVisible"
        :live-index-id="liveIndexId"
        :anchor-id="anchorId"
        @close="giftPanelVisible = false"
      />

      <PopularityRankPanel
        :visible="popularityPanelVisible"
        :live-index-id="liveIndexIdNumber"
        :anchor-name="anchorName"
        :anchor-avatar="avatar"
        @close="popularityPanelVisible = false"
        @support="handleRankSupport"
      />

      <GamePanel
        :visible="gamePanelVisible"
        @close="gamePanelVisible = false"
      />

      <UserInfoCard
        :visible="userCardVisible"
        :info="userCardInfo"
        :loading="userCardLoading"
        @close="userCardVisible = false"
      />
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { UIKitProvider, TUIMessageBox, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';
import SvgIcon from '../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../TUILiveKit/common/icons/CloseIcon.vue';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { resolveImageUrl } from '../niko/config';
import { createStreamPlayer, type StreamPlayerHandle } from '../niko/utils/flvPlayer';
import {
  joinLiveChat,
  leaveLiveChat,
  onLiveImMembers,
  onLiveImSystem,
  type LiveImMember,
  type LiveImSystemEvent,
} from '../niko/im/liveIm';
import { getAudienceCardInfo, type AudienceCardInfo } from '../niko/api/live';
import { fetchRecommendLiveList } from '../niko/api/live';
import type { NikoLiveListItem } from '../niko/api/liveList';
import { attentionUser } from '../niko/api/user';
import LiveChatPanel from '../niko/components/LiveChatPanel.vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import LiveMarquee from '../niko/components/LiveMarquee.vue';
import GiftPanel from '../niko/components/GiftPanel.vue';
import GamePanel from '../niko/components/GamePanel.vue';
import UserInfoCard from '../niko/components/UserInfoCard.vue';
import PopularityRankPanel from '../niko/components/PopularityRankPanel.vue';
import AudiencePanel from '../niko/components/AudiencePanel.vue';
import CoGuestGrid from '../niko/components/CoGuestGrid.vue';
import MoreLiveTray from '../niko/components/MoreLiveTray.vue';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import { TRTCParams, TRTCAppScene, TRTCRoleType } from 'trtc-electron-sdk';
import type { CoGuestUser } from '../niko/components/CoGuestGrid.vue';
import * as THREE from 'three/src/Three.js';

const { t } = useUIKit();
const route = useRoute();
const router = useRouter();

let title = String(route.query.liveTitle || '');
let anchorName = String(route.query.anchorName || '');
// 人数用 ref：既回退到路由初始值，也能被服务端轮询结果同步更新
const viewerCount = ref(String(route.query.viewerCount || '0'));
const avatarRaw = computed(() => String(route.query.avatar || ''));
const avatar = computed(() => avatarRaw.value ? resolveImageUrl(avatarRaw.value) : '');
// IM 群组 ID（后端 room_id）与直播场次 ID（live_index_id）
let roomId = String(route.query.roomId || '');
let liveIndexId = String(route.query.liveId || '');
// 人气榜 / 在线观众接口需要数字类型的场次 ID
const liveIndexIdNumber = computed(() => Number(liveIndexId) || undefined);
// 主播用户 ID：关注接口的 attentionUserId
let anchorId = Number(route.query.anchorId || 0);
// play_url 带签名参数，通过 history.state 传递（H5 项目同样做法）
let playUrl = String((window.history.state as Record<string, unknown> | null)?.playUrl || '');

const { login, logout } = useLoginState();

const videoEl: Ref<HTMLVideoElement | null> = ref(null);
const playerStageEl: Ref<HTMLElement | null> = ref(null);
const signalCanvasEl: Ref<HTMLCanvasElement | null> = ref(null);
const errorText = ref('');
const muted = ref(true);
const avatarError = ref(false);
const initial = computed(() => (anchorName || 'N').slice(0, 1).toUpperCase());
const imReady = ref(false);
const chatHint = ref('聊天连接中...');
const giftPanelVisible = ref(false);
const gamePanelVisible = ref(false);
const userCardVisible = ref(false);
const userCardLoading = ref(false);
const userCardInfo: Ref<AudienceCardInfo | null> = ref(null);
const popularityPanelVisible = ref(false);

// 视频后方的信号舱只随组件创建一次，同路由切房间时保留。
let signalRenderer: THREE.WebGLRenderer | null = null;
let signalScene: THREE.Scene | null = null;
let signalResizeObserver: ResizeObserver | null = null;
let signalStageElement: HTMLElement | null = null;
let signalRafId: number | null = null;
let signalPointerDownHandler: ((event: PointerEvent) => void) | null = null;
const signalPointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

function handleSignalPointerMove(event: PointerEvent) {
  const stage = signalStageElement;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  signalPointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  signalPointer.targetY = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
}

function handleSignalPointerLeave() {
  signalPointer.targetX = 0;
  signalPointer.targetY = 0;
}

function disposeSignalScene() {
  if (signalRafId !== null) {
    cancelAnimationFrame(signalRafId);
    signalRafId = null;
  }
  signalResizeObserver?.disconnect();
  signalResizeObserver = null;
  if (signalStageElement) {
    signalStageElement.removeEventListener('pointermove', handleSignalPointerMove);
    signalStageElement.removeEventListener('pointerleave', handleSignalPointerLeave);
    if (signalPointerDownHandler) {
      signalStageElement.removeEventListener('pointerdown', signalPointerDownHandler);
      signalPointerDownHandler = null;
    }
    signalStageElement = null;
  }
  if (signalScene) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    signalScene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (Array.isArray(renderable.material)) {
        renderable.material.forEach((material) => materials.add(material));
      } else if (renderable.material) {
        materials.add(renderable.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    signalScene.clear();
  }
  signalRenderer?.dispose();
  signalRenderer?.forceContextLoss();
  signalRenderer = null;
  signalScene = null;
  signalPointer.x = 0;
  signalPointer.y = 0;
  signalPointer.targetX = 0;
  signalPointer.targetY = 0;
}

function initSignalScene() {
  const canvas = signalCanvasEl.value;
  const stage = playerStageEl.value;
  if (signalRenderer || !canvas || !stage) return;

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    signalRenderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.setClearColor(0x02050d, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050d);
    scene.fog = new THREE.FogExp2(0x02050d, 0.038);
    signalScene = scene;
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
    camera.position.set(0, 0.25, 11);

    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.HemisphereLight(0x80dfff, 0x080311, 0.85));
    const cyanLight = new THREE.PointLight(0x31dcff, 20, 24, 2);
    cyanLight.position.set(-5, 2.5, 3);
    scene.add(cyanLight);
    const pinkLight = new THREE.PointLight(0xff3d9a, 18, 24, 2);
    pinkLight.position.set(5, -1, 2);
    scene.add(pinkLight);

    const rings: {
      mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
      speed: number;
      phase: number;
    }[] = [];
    const sideGroups: { group: THREE.Group; side: number; offset: number }[] = [];
    const tunnel: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    const beams: {
      mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
      phase: number;
    }[] = [];

    [-1, 1].forEach((side) => {
      const color = side < 0 ? 0x42e8ff : 0xff4b9f;
      const darkColor = side < 0 ? 0x123f52 : 0x4b1535;
      const ringGroup = new THREE.Group();
      ringGroup.position.set(0, 0.1, -3);
      ringGroup.rotation.set(0.12, side * -0.42, side * 0.08);
      world.add(ringGroup);
      sideGroups.push({ group: ringGroup, side, offset: 0 });

      for (let i = 0; i < 3; i += 1) {
        const material = new THREE.MeshStandardMaterial({
          color: darkColor,
          emissive: color,
          emissiveIntensity: i === 1 ? 0.42 : 0.72,
          metalness: 0.9,
          roughness: 0.24,
          transparent: true,
          opacity: i === 1 ? 0.88 : 0.68,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(1.55 + i * 0.34, i === 1 ? 0.055 : 0.024, 8, 96),
          material,
        );
        mesh.position.z = -i * 0.38;
        mesh.rotation.x = (i - 1) * 0.09;
        ringGroup.add(mesh);
        rings.push({ mesh, speed: side * (0.025 + i * 0.009), phase: i + side });
      }

      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.17, 0.012, 6, 96),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      innerRing.position.z = 0.16;
      ringGroup.add(innerRing);

      const frameGroup = new THREE.Group();
      frameGroup.position.z = -4.2;
      frameGroup.rotation.set(0.03, side * 0.22, side * -0.025);
      world.add(frameGroup);
      sideGroups.push({ group: frameGroup, side, offset: 0.5 });
      const panelGeometry = new THREE.BoxGeometry(2.9, 5.8, 0.08);
      const panel = new THREE.Mesh(
        panelGeometry,
        new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.12,
          roughness: 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          transparent: true,
          opacity: 0.065,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      frameGroup.add(panel);
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: darkColor,
        emissive: color,
        emissiveIntensity: 0.18,
        metalness: 0.96,
        roughness: 0.2,
      });
      const verticalGeometry = new THREE.BoxGeometry(0.065, 5.95, 0.13);
      const horizontalGeometry = new THREE.BoxGeometry(2.96, 0.065, 0.13);
      [-1, 1].forEach((direction) => {
        const vertical = new THREE.Mesh(verticalGeometry, frameMaterial);
        vertical.position.x = direction * 1.47;
        frameGroup.add(vertical);
        const horizontal = new THREE.Mesh(horizontalGeometry, frameMaterial);
        horizontal.position.y = direction * 2.94;
        frameGroup.add(horizontal);
      });
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(panelGeometry),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      frameGroup.add(edges);

      for (let i = 0; i < 2; i += 1) {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.065, 10, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        beam.position.set(side * (3.1 + i * 1.7), 0, -5 - i * 3);
        beam.rotation.set(0.16, 0, side * (0.24 + i * 0.13));
        world.add(beam);
        beams.push({ mesh: beam, phase: i * 1.7 + side });
      }
    });

    for (let i = 0; i < 5; i += 1) {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(3.65 + i * 0.24, 0.016, 6, 112),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x2dcde8 : 0xb52c78,
          transparent: true,
          opacity: 0.16 - i * 0.018,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      hoop.position.z = -7 - i * 3.1;
      hoop.scale.y = 0.74;
      hoop.rotation.z = i * 0.16;
      world.add(hoop);
      tunnel.push(hoop);
    }

    const grid = new THREE.GridHelper(28, 28, 0x16445f, 0x0b243c);
    grid.position.set(0, -3.15, -7);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.16;
      material.depthWrite = false;
    });
    world.add(grid);

    const particleCount = 280;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 19;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      particlePositions[i * 3 + 2] = -26 + Math.random() * 29;
      const tint = new THREE.Color(i % 4 === 0 ? 0xff4da6 : 0x55e7ff);
      tint.toArray(particleColors, i * 3);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    world.add(particles);

    // ---- 增强氛围层：侧翼能量流、悬浮碎片、光标光环、点击冲击波 ----
    const streamCount = 240;
    const streamPositions = new Float32Array(streamCount * 3);
    const streamBaseX = new Float32Array(streamCount);
    const streamSpeeds = new Float32Array(streamCount);
    const streamColors = new Float32Array(streamCount * 3);
    for (let i = 0; i < streamCount; i += 1) {
      const side = i % 2 ? 1 : -1;
      streamBaseX[i] = side * (3.5 + Math.random() * 3.2);
      streamPositions[i * 3] = streamBaseX[i];
      streamPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      streamPositions[i * 3 + 2] = -3 - Math.random() * 10;
      streamSpeeds[i] = 0.5 + Math.random() * 1.2;
      const tint = new THREE.Color(side > 0 ? 0xff5fb4 : 0x5fe6ff);
      tint.toArray(streamColors, i * 3);
    }
    const streamGeometry = new THREE.BufferGeometry();
    streamGeometry.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
    streamGeometry.setAttribute('color', new THREE.BufferAttribute(streamColors, 3));
    const streamPoints = new THREE.Points(
      streamGeometry,
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    world.add(streamPoints);

    const shards = Array.from({ length: 14 }, (_, index) => {
      const side = index % 2 ? 1 : -1;
      const geometry = index % 3 === 0
        ? new THREE.OctahedronGeometry(0.18 + (index % 4) * 0.05, 0)
        : new THREE.TetrahedronGeometry(0.22 + (index % 3) * 0.08, 0);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: side > 0 ? 0xff4da6 : 0x55e7ff,
          transparent: true,
          opacity: 0.42,
          wireframe: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.position.set(
        side * (3.3 + Math.random() * 2.8),
        (Math.random() - 0.5) * 5.2,
        -3 - Math.random() * 8,
      );
      world.add(mesh);
      return { mesh, baseX: mesh.position.x, baseY: mesh.position.y, phase: index * 0.82 };
    });

    const haloGroup = new THREE.Group();
    haloGroup.position.z = -3;
    scene.add(haloGroup);
    const haloOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.009, 6, 96),
      new THREE.MeshBasicMaterial({
        color: 0x7ce9ff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const haloInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.012, 6, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff6fc2,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    haloGroup.add(haloOuter, haloInner);

    const rippleGroup: {
      mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
      startedAt: number;
    }[] = [];
    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xff5fb4 : 0x5fe6ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.014, 6, 96), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, -3.05, -5);
      world.add(mesh);
      rippleGroup.push({ mesh, startedAt: -10 });
    }
    let rippleIndex = 0;
    let rippleClock = 0;

    const resize = () => {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      sideGroups.forEach(({ group, side, offset }) => {
        group.position.x = side * (Math.max(3.8, camera.aspect * 3.25) + offset);
      });
    };
    signalResizeObserver = new ResizeObserver(resize);
    signalResizeObserver.observe(stage);
    resize();

    signalStageElement = stage;
    stage.addEventListener('pointermove', handleSignalPointerMove, { passive: true });
    stage.addEventListener('pointerleave', handleSignalPointerLeave);
    // 点击影片外的背景区域生成冲击波，不拦截任何原本的点击行为
    signalPointerDownHandler = (event: PointerEvent) => {
      if (event.target !== stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ripple = rippleGroup[rippleIndex];
      rippleIndex = (rippleIndex + 1) % rippleGroup.length;
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      ripple.mesh.position.x = nx * Math.max(3.6, camera.aspect * 3.2);
      ripple.mesh.position.z = -5 - ny * 2.4;
      ripple.startedAt = rippleClock;
    };
    stage.addEventListener('pointerdown', signalPointerDownHandler, { passive: true });

    const frameInterval = 1000 / 30;
    let lastFrame = 0;
    let previousFrame = performance.now();
    const animate = (now: number) => {
      if (signalRenderer !== renderer) return;
      signalRafId = requestAnimationFrame(animate);
      if (now - lastFrame < frameInterval - 1) return;
      const delta = Math.min((now - previousFrame) / 1000, 0.05);
      previousFrame = now;
      lastFrame = now;
      const elapsed = now * 0.001;

      signalPointer.x += (signalPointer.targetX - signalPointer.x) * 0.055;
      signalPointer.y += (signalPointer.targetY - signalPointer.y) * 0.055;
      camera.position.x = signalPointer.x * 0.38;
      camera.position.y = 0.25 + signalPointer.y * 0.24;
      camera.lookAt(signalPointer.x * 0.08, signalPointer.y * 0.05, -4);
      world.rotation.y = signalPointer.x * 0.018;
      world.rotation.x = signalPointer.y * -0.012;

      rings.forEach(({ mesh, speed, phase }) => {
        mesh.rotation.z = elapsed * speed;
        mesh.rotation.y = Math.sin(elapsed * 0.22 + phase) * 0.07;
      });
      tunnel.forEach((hoop, index) => {
        hoop.rotation.z = index * 0.16 + elapsed * (index % 2 === 0 ? 0.009 : -0.009);
      });
      beams.forEach(({ mesh, phase }) => {
        mesh.material.opacity = 0.09 + (Math.sin(elapsed * 0.7 + phase) + 1) * 0.032;
      });

      for (let i = 0; i < particleCount; i += 1) {
        const zIndex = i * 3 + 2;
        particlePositions[zIndex] += delta * 0.62;
        if (particlePositions[zIndex] > 3) particlePositions[zIndex] = -26;
      }
      particleGeometry.attributes.position.needsUpdate = true;
      particles.rotation.y = Math.sin(elapsed * 0.05) * 0.025;

      for (let i = 0; i < streamCount; i += 1) {
        const yIndex = i * 3 + 1;
        streamPositions[yIndex] += delta * streamSpeeds[i] * 1.1;
        if (streamPositions[yIndex] > 4.6) streamPositions[yIndex] = -4.6;
        streamPositions[i * 3] = streamBaseX[i]
          + signalPointer.x * 0.45
          + Math.sin(elapsed * 0.6 + i) * 0.06;
      }
      streamGeometry.attributes.position.needsUpdate = true;

      shards.forEach(({ mesh, baseX, baseY, phase }) => {
        mesh.rotation.x = phase + elapsed * 0.3;
        mesh.rotation.y = phase * 0.7 - elapsed * 0.22;
        mesh.position.y = baseY + Math.sin(elapsed * 0.55 + phase) * 0.24;
        mesh.position.x = baseX + signalPointer.x * 0.3;
      });

      haloGroup.position.x = signalPointer.x * Math.max(3.4, camera.aspect * 3.1);
      haloGroup.position.y = signalPointer.y * 2.3 + 0.2;
      haloGroup.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.08);
      haloOuter.rotation.z = elapsed * 0.8;
      haloInner.rotation.z = -elapsed * 1.2;

      rippleClock = elapsed;
      rippleGroup.forEach(({ mesh, startedAt }) => {
        const age = elapsed - startedAt;
        if (age < 0 || age > 1.2) {
          mesh.material.opacity = 0;
          return;
        }
        const progress = age / 1.2;
        mesh.scale.setScalar(0.4 + progress * 4.2);
        mesh.material.opacity = 0.45 * (1 - progress);
      });

      renderer.render(scene, camera);
    };
    signalRafId = requestAnimationFrame(animate);
  } catch (error) {
    console.warn('[LivePlayer] signal scene init failed:', error);
    disposeSignalScene();
  }
}

// ========== TRTC 独立连麦宫格 ==========
// 主播端推流用 liveIndexId 作为 TRTC strRoomId，观众端进房同理
const trtcReady = ref(false);
// 主播 userId：优先用路由 query 里的 anchorId，fallback 到当前登录用户
const trtcAnchorUserId = ref(String(anchorId || ''));
const guestUsers = ref<CoGuestUser[]>([]); // 连麦观众列表（不含主播）
const coGuestGridRef: Ref<any> = ref(null);
// 记录当前登录用户 userId
const myUserId = computed(() => {
  try {
    const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!stored) return '';
    return String(JSON.parse(stored).userId || '');
  } catch {
    return '';
  }
});

let trtcEntered = false;
const remoteUserStates = new Map<string, { videoAvailable: boolean; nickname?: string }>();

/** 模块级 onEnterRoom 引用，cleanupTrtc 必须能 off 到同一个函数引用 */
let _pendingOnEnterRoom: ((result: number) => void) | null = null;

function getAnchorUserId(): string {
  return trtcAnchorUserId.value || myUserId.value;
}

function startRemoteViewSafe(userId: string) {
  if (!trtcEntered) return;
  const el = coGuestGridRef.value?.getVideoEl?.(userId);
  if (!el) return;
  try {
    // startRemoteView 需要一个 video element 或 div，传 video 元素可以直接播放
    trtcCloud.startRemoteView(userId, el);
    console.log('[LivePlayer] TRTC startRemoteView:', userId);
  } catch (e) {
    console.warn('[LivePlayer] startRemoteView failed:', userId, e);
  }
}

function stopRemoteViewSafe(userId: string) {
  if (!trtcEntered) return;
  try {
    trtcCloud.stopRemoteView(userId);
  } catch (e) {
    console.warn('[LivePlayer] stopRemoteView failed:', userId, e);
  }
}

function refreshGuestList() {
  // 主播（用路由 anchorId 匹配）不进 guest list
  const anchorId = getAnchorUserId();
  const list: CoGuestUser[] = [];
  remoteUserStates.forEach((state, uid) => {
    if (uid === anchorId) {
      // 主播（route 里的 anchorId 或者 fallback 到 myUserId）
      return;
    }
    if (state.videoAvailable) {
      list.push({ userId: uid, nickname: state.nickname });
    }
  });
  // 稳定排序：按 userId 字典序，避免切换闪烁
  list.sort((a, b) => a.userId.localeCompare(b.userId));
  guestUsers.value = list;
}

function onRemoteUserVideoAvailable(userId: string, available: boolean) {
  const state = remoteUserStates.get(userId) || { videoAvailable: false };
  state.videoAvailable = available;
  remoteUserStates.set(userId, state);
  if (available) {
    // 给 video 元素挂载好后 startRemoteView
    // CoGuestGrid 会渲染新的 slot → onCoGuestVideoReady 触发 → 调用 startRemoteView
  } else {
    stopRemoteViewSafe(userId);
  }
  refreshGuestList();
}

function onRemoteUserEnterRoom(userId: string) {
  // 记录下 nickname 如果有（TRTC 事件里可能不带）
  if (!remoteUserStates.has(userId)) {
    remoteUserStates.set(userId, { videoAvailable: false });
  }
}

function onCoGuestVideoReady(users: CoGuestUser[]) {
  // DOM 渲染完成后，把需要的远端视频挂上去
  for (const u of users) {
    const remote = remoteUserStates.get(u.userId);
    if (remote?.videoAvailable) {
      startRemoteViewSafe(u.userId);
    }
  }
}

function onCoGuestVideoRemove(userIds: string[]) {
  for (const uid of userIds) {
    stopRemoteViewSafe(uid);
  }
}

function enterTrtcRoomAsAudience(roomId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!stored) {
      reject(new Error('TRTC 登录信息缺失'));
      return;
    }
    const userInfo = JSON.parse(stored);
    const params = new TRTCParams(
      Number(userInfo.sdkAppId),
      String(userInfo.userId || ''),
      String(userInfo.userSig || ''),
      0,
      String(roomId),
      TRTCRoleType.TRTCRoleAudience,
    );
    // 存引用到模块级变量，cleanupTrtc 能正确 off
    const handler = (result: number) => {
      // 先 off（用闭包里的 handler 引用），再清模块级变量
      trtcCloud.off('onEnterRoom', handler);
      _pendingOnEnterRoom = null;
      if (result >= 0) {
        trtcEntered = true;
        trtcReady.value = true;
        resolve(result);
      } else {
        reject(new Error(`TRTC enterRoom failed, code: ${result}`));
      }
    };
    _pendingOnEnterRoom = handler;
    trtcCloud.on('onEnterRoom', handler);
    // 绑定远端事件
    trtcCloud.on('onRemoteUserVideoAvailable', onRemoteUserVideoAvailable);
    trtcCloud.on('onRemoteUserEnterRoom', onRemoteUserEnterRoom);
    trtcCloud.enterRoom(params, TRTCAppScene.TRTCAppSceneLIVE);
  });
}

/**
 * 彻底清理 TRTC 状态：
 * 1) 同步 off 所有事件 → 防止 SDK 后续回调操作销毁中的 LivePlayer
 * 2) 同步 stopRemoteView 所有远端流 + 清空 DOM 容器 → 防止异步 SDK 还在渲染连线画面
 * 3) 发起 exitRoom 并返回一个 Promise，等 onExitRoom 回调（外部用 onBeforeRouteLeave await）
 */
function cleanupTrtc(): Promise<void> {
  // 无论之前有没有 enterRoom，都把所有我们绑过的事件 off 掉（安全，重复 off 无副作用）
  try {
    if (_pendingOnEnterRoom) {
      trtcCloud.off('onEnterRoom', _pendingOnEnterRoom);
      _pendingOnEnterRoom = null;
    }
    trtcCloud.off('onExitRoom', onExitRoom);
    trtcCloud.off('onRemoteUserVideoAvailable', onRemoteUserVideoAvailable);
    trtcCloud.off('onRemoteUserEnterRoom', onRemoteUserEnterRoom);
    trtcCloud.off('onRemoteUserLeaveRoom', onRemoteUserLeaveRoom);
  } catch (e) {
    // 忽略
  }

  // 先同步 stop 所有远端视图 + 清所有 DOM
  try {
    remoteUserStates.forEach((_state, uid) => stopRemoteViewSafe(uid));
    // 同步清空 CoGuestGrid 渲染出来的所有视频元素 —— 关键！
    // 防止 SDK 即使在 exitRoom 还没完成时，继续把连线画面渲染到我们的 DOM 上
    const gridEl = coGuestGridRef.value?.$el as HTMLElement | undefined;
    if (gridEl) {
      try {
        gridEl.querySelectorAll('video, canvas').forEach((el) => {
          try { (el as any).pause?.(); } catch {}
          try { (el as any).src = ''; } catch {}
          try { (el as any).remove?.(); } catch {}
        });
        gridEl.innerHTML = '';
      } catch (e) {
        console.warn('[LivePlayer] clear CoGuestGrid DOM failed:', e);
      }
    }
  } catch (e) {
    console.warn('[LivePlayer] stopRemoteViewSafe failed:', e);
  }
  remoteUserStates.clear();
  guestUsers.value = [];

  // 发起 exitRoom 并等 onExitRoom 回调（最多等 3 秒兜底）
  if (trtcEntered) {
    return new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = () => {
        if (resolved) return;
        resolved = true;
        trtcCloud.off('onExitRoom', _onExitRoomWaiter);
        trtcEntered = false;
        trtcReady.value = false;
        trtcAnchorUserId.value = '';
        resolve();
      };
      const _onExitRoomWaiter = (_reason: number) => resolveOnce();
      // 3 秒兜底 —— 防止 SDK 卡死不回调
      const timer = window.setTimeout(resolveOnce, 3000);
      // resolveOnce 回调里会 off，但 timer 先到也需要 off
      const _timer = timer;
      const originalResolve = resolveOnce;
      // 包装一下：timer 超时时也要 off 掉我们的 handler
      _timer; // 避免 lint warning
      trtcCloud.on('onExitRoom', _onExitRoomWaiter);
      try {
        trtcCloud.exitRoom();
      } catch (e) {
        // exitRoom 抛异常直接 resolve，不要卡住路由
        console.warn('[LivePlayer] exitRoom threw:', e);
        resolveOnce();
      }
    });
  }

  // 没 enterRoom，直接返回 resolved Promise
  trtcEntered = false;
  trtcReady.value = false;
  trtcAnchorUserId.value = '';
  return Promise.resolve();
}

// 防止 enterTrtcRoomAsAudience 内部的 onEnterRoom 闭包在 cleanup 后仍持有引用
// 用具名函数方便 off
function onExitRoom(_reason: number) {
  // LivePlayer 已经 cleanup 了，忽略
}
function onRemoteUserLeaveRoom(_userInfo: any) {
  // 同上
}

async function initTrtc() {
  if (!liveIndexId) {
    console.warn('[LivePlayer] skip TRTC: no liveIndexId');
    return;
  }
  try {
    const result = await enterTrtcRoomAsAudience(liveIndexId);
    console.log('[LivePlayer] TRTC audience enterRoom ok:', result, 'roomId:', liveIndexId);
  } catch (error: any) {
    console.warn('[LivePlayer] TRTC enterRoom failed (FLV fallback still works):', error?.message || error);
    // TRTC 失败不影响 FLV 主画面，只是没有独立连麦宫格
  }
}

function exitTrtc(): Promise<void> {
  return cleanupTrtc();
}

// 关注：接口没有查询态，默认未关注，点一次以接口结果为准
const canFollow = computed(() => Number.isFinite(anchorId) && anchorId > 0);
const following = ref(false);
const followLoading = ref(false);

async function handleToggleFollow() {
  if (!canFollow.value || followLoading.value) {
    return;
  }
  const next = !following.value;
  followLoading.value = true;
  try {
    const res = await attentionUser({ attentionUserId: anchorId, attentionStatus: next ? 1 : 0 });
    if (res && res.result === false) {
      throw new Error('操作失败');
    }
    following.value = next;
  } catch (error: any) {
    console.warn('[LivePlayer] attention failed:', error?.message || error);
  } finally {
    followLoading.value = false;
  }
}

/** 人气榜「为Ta助力」：关闭榜单，直接打开礼物面板 */
function handleRankSupport() {
  popularityPanelVisible.value = false;
  giftPanelVisible.value = true;
}

// 更多直播：长条弹窗由 MoreLiveTray 组件自行拉取（同一 recommendLiveList 接口，一次 200 条）
const moreLiveVisible = ref(false);

function toggleMoreLive() {
  moreLiveVisible.value = !moreLiveVisible.value;
}

/** 进入另一个直播间：同路由切换不会重建组件，push 后整页重载 */
function enterOtherLive(item: NikoLiveListItem) {
  moreLiveVisible.value = false;
  // 点到自己当前所在的房间，不需要重载
  if (item.liveIndexId === liveIndexId) {
    return;
  }
  void router
    .push({
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
      state: { playUrl: item.playUrl },
    })
    .catch((e) => console.warn('[LivePlayer] push failed:', e));
}

// 在线观众折叠组件：群消息 audience_list 下发的成员列表（liveIm 内已做解析）
const audienceMembers = ref<LiveImMember[]>([]);
const audiencePanelVisible = ref(false);
// 叠层最多展示 5 个头像，多出的只体现在人数上
const audiencePreview = computed(() => audienceMembers.value.slice(0, 5));
const audienceCountText = computed(() => (
  audienceMembers.value.length > 0 ? String(audienceMembers.value.length) : viewerCount.value
));

let unsubscribeMembers: (() => void) | null = null;

let playerHandle: StreamPlayerHandle | null = null;
let unsubscribeSystem: (() => void) | null = null;
let destroyed = false;

/** 拉流错误连续计数：网络抖动 vs 真停播 */
let streamErrorCount = 0;
let streamErrorTimer: number | null = null;

/** 播放停滞兜底：直播流只要超过 1 秒没有新视频帧（currentTime 不推进），
 *  就等于流已断。CDN 在主播关播时常常「静默保活」——不报错也不断开连接，
 *  所以必须靠这个兜底，且阈值要短，否则观众要等很久才退出。 */
const STALL_TIMEOUT_MS = 1 * 1000;
let stallTimer: number | null = null;
let lastVideoTime = 0;
/** 是否真正开始过播放：避免首次缓冲阶段被误判成断流 */
let hasPlayedOnce = false;

/** 重置停滞计时器：每次收到新视频帧时调用 */
function resetStallTimer() {
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  // 还没真正出过画面（首帧缓冲中）不启用停滞判定
  if (!hasPlayedOnce) {
    return;
  }
  stallTimer = window.setTimeout(() => {
    if (destroyed) {
      return;
    }
    // 阈值内 currentTime 没任何推进 = 流已死
    if (videoEl.value && videoEl.value.currentTime === lastVideoTime) {
      console.warn('[LivePlayer] stall timeout: no new frames in', STALL_TIMEOUT_MS, 'ms, treating as stream ended');
      void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
    } else {
      // 还在推进，说明是我误判了，重开计时器
      resetStallTimer();
    }
  }, STALL_TIMEOUT_MS);
}

/** 等待指定毫秒（给弹框设置最长等待时间，避免 await 永久挂起） */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** 服务端权威下播判定：每 2 秒查一次在播列表（recommendLiveList，业务域），
 *  主播关播后房间会从列表里消失，连续 2 次消失即判定下播并退出。
 *  不依赖 flv.js 的错误事件 —— 实测 CDN 在主播关播时会静默保活连接，不报任何错。 */
const LIVE_STATUS_POLL_MS = 2 * 1000;
const LIVE_STATUS_PAGE_SIZE = 50;
let liveStatusTimer: number | null = null;
let missingFromListCount = 0;

function stopLiveStatusPoll() {
  if (liveStatusTimer !== null) {
    window.clearInterval(liveStatusTimer);
    liveStatusTimer = null;
  }
}

async function pollLiveStatus() {
  if (destroyed || !roomId) {
    return;
  }
  try {
    const result = await fetchRecommendLiveList(1, LIVE_STATUS_PAGE_SIZE, { force: true });
    if (destroyed) {
      return;
    }
    const matched = result.list.find(
      (item) => item.roomId === roomId || (liveIndexId !== '' && item.liveIndexId === liveIndexId),
    );
    // 顺带用服务端返回的在看人数同步顶部「x 人观看」
    if (matched && matched.viewerCount != null) {
      viewerCount.value = String(matched.viewerCount);
    }
    // 只有返回不足一页的完整列表时，才能确定「不在列表里 == 已下播」
    const complete = result.list.length < LIVE_STATUS_PAGE_SIZE;
    if (matched || !complete) {
      missingFromListCount = 0;
      return;
    }
    missingFromListCount += 1;
    console.warn('[LivePlayer] room not in recommendLiveList, count:', missingFromListCount);
    if (missingFromListCount >= 2) {
      stopLiveStatusPoll();
      void exitRoom('直播已结束', '主播已结束直播', true);
    }
  } catch {
    // 接口异常不作为下播依据
    missingFromListCount = 0;
  }
}

function startLiveStatusPoll() {
  stopLiveStatusPoll();
  void pollLiveStatus();
  liveStatusTimer = window.setInterval(() => {
    void pollLiveStatus();
  }, LIVE_STATUS_POLL_MS);
}

/**
 * 退出直播间的统一入口。
 * 关键：弹框不能阻塞跳转 —— 弹窗宿主随页面卸载时 TUIMessageBox 的 Promise 可能永不
 * resolve，之前就是因此卡在直播间。这里用 race 限制最长等待，再强制跳转，并用 hash 兜底。
 * silent=true 时不弹框直接退出（拉流中断/关播检测这类不需要用户确认的场景）。
 */
async function exitRoom(title: string, message: string, silent = false) {
  if (destroyed) {
    return;
  }
  destroyed = true;
  stopLiveStatusPoll();
  // 退出直播间时关闭本次打开的游戏窗口
  try {
    window.ipcRenderer?.send('close-game-mobile', null);
  } catch {
    // 忽略 IPC 异常
  }
  // 离开 IM 群（异步，不阻塞退出流程）
  void leaveLiveChat();
  // TRTC 独立连麦宫格：退出房间
  exitTrtc();
  // 销毁播放器与停滞计时器
  await playerHandle?.destroy();
  playerHandle = null;
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  if (!silent) {
    try {
      await Promise.race([
        TUIMessageBox({ title, message, confirmButtonText: '确定' }).catch(() => undefined),
        delay(1500),
      ]);
    } catch {
      // 用户关闭弹窗也一样退出
    }
  }
  try {
    await router.replace({ name: 'anchor-list' });
  } catch (error) {
    console.warn('[LivePlayer] router.replace failed:', error);
  }
  // 兜底：路由跳转未生效时直接改 hash，保证一定退回主播列表
  if (router.currentRoute.value.name !== 'anchor-list') {
    window.location.hash = '#/anchor-list';
  }
}

/**
 * 拉流错误处理：flv.js ERROR 事件现在传来的 detail 格式为
 * "[network] network-error {...}" / "[network] network-timeout {...}" 等。
 * Network / Media 类错误直接退出（停播时 CDN 会返回明确错误），
 * 其他格式错误等累计 3 次再退（给网络抖动留余地）。
 */
function handleStreamError(detail: string) {
  if (destroyed) {
    return;
  }
  const lower = String(detail).toLowerCase();
  // Network / Media / 404 / stream-not-found 都是「真的停播」
  const isTerminal = /\[network\]|\[media\]|network-error|network-timeout|media-error|media-format-error|stream.*not.*found|stream.*ended|live.*ended|notfound|404|loaderror/i.test(lower);
  errorText.value = '直播已结束或拉流失败';
  console.warn('[LivePlayer] stream error:', detail, '(terminal?', isTerminal, ')');

  if (isTerminal) {
    void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
    return;
  }
  // 非明确错误：累计 3 次才退出，避免网络抖动误判
  streamErrorCount++;
  if (streamErrorTimer) {
    clearTimeout(streamErrorTimer);
  }
  streamErrorTimer = window.setTimeout(() => {
    streamErrorCount = 0;
  }, 3000);
  if (streamErrorCount >= 3) {
    void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
  }
}

/**
 * 观看直播间需要 IM 登录 + 加入直播群：
 * - 主播列表页没有登录 IM，这里用本地登录凭据登录一次；
 * - 退出 LivePlayer 时会 logout，与 TUILiveKitWin 完全隔离，互不影响。
 */
async function initChat() {
  if (!roomId) {
    chatHint.value = '聊天室信息缺失';
    return;
  }
  const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  if (!stored) {
    chatHint.value = '登录信息失效，请重新登录';
    return;
  }
  try {
    const { sdkAppId, userId, userSig } = JSON.parse(stored);
    // 无条件执行 login：chat 实例存在 ≠ 已登录
    // TUIChatEngine-Lite import 时就会创建 chat 对象，但没 login 的话 joinGroup 会报 code:2024
    // useLoginState().login 内部有幂等保护，已登录且同 userId 时直接返回，不会互踢
    await login({
      sdkAppId: Number(sdkAppId),
      userId: String(userId),
      userSig: String(userSig),
    });
    console.log('[LivePlayer] TUIKit IM login success:', userId);
    await joinLiveChat(roomId);
    console.log('[LivePlayer] live chat ready, roomId:', roomId);
    imReady.value = true;
  } catch (error: any) {
    console.error('[LivePlayer] init chat failed:', error?.message || error);
    chatHint.value = error?.message ? `聊天连接失败：${error.message}` : '聊天连接失败';
  }
}

/** 点击聊天室昵称/等级拉取用户卡片（对齐 web-obs-live 的 /live/audienceCardInfo） */
async function handleUserClick(payload: { userId: string; isMystery: boolean }) {
  if (!payload?.userId) {
    return;
  }
  userCardInfo.value = null;
  userCardVisible.value = true;
  userCardLoading.value = true;
  try {
    const result: any = await getAudienceCardInfo({
      audienceUserId: payload.userId,
      liveIndexId: liveIndexId || undefined,
    });
    const info = result?.audience_info || result?.data?.audience_info;
    if (info) {
      info.is_mystery = payload.isMystery;
      userCardInfo.value = info;
    } else {
      userCardVisible.value = false;
    }
  } catch (error: any) {
    console.warn('[LivePlayer] get audience card failed:', error?.message || error);
    userCardVisible.value = false;
  } finally {
    userCardLoading.value = false;
  }
}

/** 点击直播间顶部主播头像/昵称，弹出主播信息卡片（复用观众信息卡） */
async function handleAnchorClick() {
  if (!anchorId) {
    return;
  }
  // 先用路由里的本地信息占位，避免接口慢/失败时空白
  const fallback: AudienceCardInfo = {
    user_id: anchorId,
    nickname: anchorName || '主播',
    avatar: avatar.value || '',
    user_show_id: '',
    introduction: '',
  };
  userCardInfo.value = fallback;
  userCardVisible.value = true;
  userCardLoading.value = true;
  try {
    const result: any = await getAudienceCardInfo({
      audienceUserId: anchorId,
      liveIndexId: liveIndexId || undefined,
    });
    const info = result?.audience_info || result?.data?.audience_info;
    if (info) {
      userCardInfo.value = { ...fallback, ...info };
      if (info.is_attention !== undefined) {
        following.value = Boolean(Number(info.is_attention));
      }
    }
  } catch (error: any) {
    console.warn('[LivePlayer] get anchor card failed:', error?.message || error);
  } finally {
    userCardLoading.value = false;
  }
}

/** 下播 / 禁播 / 封禁 / 警告（对齐 web-obs-live ChatRoom 的 53、118、system_aide） */
async function handleSystemEvent(event: LiveImSystemEvent) {
  if (event.kind === 'system' && !event.stop) {
    try {
      await TUIMessageBox({
        title: '系统提示',
        message: event.reason,
        confirmButtonText: '确定',
      });
    } catch {
      // 用户关闭弹窗
    }
    return;
  }
  if (event.kind === 'warning') {
    try {
      await TUIMessageBox({
        title: '警告',
        message: event.reason || '主播收到平台警告',
        confirmButtonText: '确定',
      });
    } catch {
      // 用户关闭弹窗
    }
    return;
  }
  if (!event.stop) {
    return;
  }
  const title = event.kind === 'ended' ? '直播已结束' : '封禁提示';
  const message = event.reason || (event.kind === 'ended' ? '主播已结束直播' : '直播间已被封禁');
  // 复用 exitRoom：弹框 + 离群 + 路由
  void exitRoom(title, message);
}

function toggleSound() {
  const el = videoEl.value;
  if (!el) {
    return;
  }
  el.muted = !el.muted;
  // 开启声音时重新 play()，否则某些浏览器不会出声
  if (!el.muted) {
    void el.play().catch(() => undefined);
  }
  muted.value = el.muted;
}

/**
 * 彻底清理所有全局状态（IM + TRTC + 播放器），
 * 返回一个 Promise，等所有异步操作完成后 resolve。
 * 在点击 .player-back 的这一刻就调用它，确保离开 LivePlayer 时
 * 所有模块级单例都被 reset 到和初始化一样的干净状态，
 * 不会把任何画面/事件/状态带到其他页面（尤其 TUILiveKitWin）。
 */
async function doFullCleanup(preserveSignalScene = false): Promise<void> {
  if (!preserveSignalScene) {
    disposeSignalScene();
  }
  if (_cleanupStarted) return;
  _cleanupStarted = true;
  destroyed = true;

  // 1) 停 FLV 播放器 + 各种定时器 —— await 确保 FetchStreamLoader pump 彻底停
  stopLiveStatusPoll();
  try { window.ipcRenderer?.send('close-game-mobile', null); } catch { /* ignore */ }
  if (streamErrorTimer) { clearTimeout(streamErrorTimer); streamErrorTimer = null; }
  streamErrorCount = 0;
  if (stallTimer !== null) { window.clearTimeout(stallTimer); stallTimer = null; }
  lastVideoTime = 0;
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  unsubscribeMembers?.();
  unsubscribeMembers = null;
  await playerHandle?.destroy();
  playerHandle = null;

  // 2) 同步 off 所有 TRTC 事件 + stopRemoteView + 清空 DOM 容器
  //    → 防止异步 SDK 还在渲染连线画面、回调操作已销毁的 LivePlayer
  try {
    if (_pendingOnEnterRoom) {
      trtcCloud.off('onEnterRoom', _pendingOnEnterRoom);
      _pendingOnEnterRoom = null;
    }
    trtcCloud.off('onExitRoom', onExitRoom);
    trtcCloud.off('onRemoteUserVideoAvailable', onRemoteUserVideoAvailable);
    trtcCloud.off('onRemoteUserEnterRoom', onRemoteUserEnterRoom);
    trtcCloud.off('onRemoteUserLeaveRoom', onRemoteUserLeaveRoom);
  } catch { /* ignore */ }

  try {
    remoteUserStates.forEach((_state, uid) => stopRemoteViewSafe(uid));
    // 同步清空 CoGuestGrid 里所有 video/canvas —— 关键！防止 SDK 继续渲染到旧 DOM
    const gridEl = coGuestGridRef.value?.$el as HTMLElement | undefined;
    if (gridEl) {
      gridEl.querySelectorAll('video, canvas').forEach((el) => {
        try { (el as any).pause?.(); } catch {}
        try { (el as any).src = ''; } catch {}
        try { (el as any).remove?.(); } catch {}
      });
      gridEl.innerHTML = '';
    }
  } catch { /* ignore */ }

  remoteUserStates.clear();
  guestUsers.value = [];

  // 3) 并行等待 TRTC exitRoom + IM leaveLiveChat + logout 全部完成
  //    SDK 文档明确要求："请等待 onExitRoom() 回调到来后再执行下次 enterRoom"
  try {
    await Promise.allSettled([
      // TRTC exitRoom（cleanupTrtc 返回 Promise，等 onExitRoom 回调或 3s 兜底）
      trtcEntered ? new Promise<void>((resolve) => {
        let resolved = false;
        const resolveOnce = () => {
          if (resolved) return;
          resolved = true;
          trtcCloud.off('onExitRoom', _waiter);
          trtcEntered = false;
          trtcReady.value = false;
          trtcAnchorUserId.value = '';
          resolve();
        };
        const _waiter = (_reason: number) => resolveOnce();
        const _timer = window.setTimeout(resolveOnce, 3000);
        void _timer;
        trtcCloud.on('onExitRoom', _waiter);
        try { trtcCloud.exitRoom(); } catch { resolveOnce(); }
      }) : Promise.resolve(),
      // IM 离开群 + 登出
      leaveLiveChat().catch(() => undefined),
      logout().catch(() => undefined),
    ]);
  } catch (e) {
    console.warn('[LivePlayer] doFullCleanup error:', e);
  }
}

function handleBack() {
  // 点击返回按钮的这一刻就同步发起所有清理，
  // 等全部完成（TRTC exitRoom + IM logout + 播放器销毁）再切路由。
  // 确保 TUILiveKitWin 进来时所有模块级单例都是干净的。
  void doFullCleanup().finally(() => {
    router.push({ name: 'anchor-list' });
  });
}

async function startPlayback() {
  const el = videoEl.value;
  if (!el) {
    return;
  }
  if (!playUrl) {
    errorText.value = '直播地址无效，请返回列表重新进入';
    return;
  }

  // 每次 timeupdate 都说明有新帧，重置停滞计时器
  const onTimeUpdate = () => {
    if (destroyed) {
      return;
    }
    lastVideoTime = el.currentTime;
    resetStallTimer();
  };
  el.addEventListener('timeupdate', onTimeUpdate);

  // 直播流结束（MSE 主动 endOfStream）→ 立即退出
  const onEnded = () => {
    if (destroyed) {
      return;
    }
    console.warn('[LivePlayer] video ended, treating as stream ended');
    void exitRoom('直播已结束', '主播已结束直播', true);
  };
  el.addEventListener('ended', onEnded);

  // 缓冲等待（waiting）：直播流断开时比 stalled 更早触发
  let waitingTimer: number | null = null;
  const clearWaitingTimer = () => {
    if (waitingTimer !== null) {
      window.clearTimeout(waitingTimer);
      waitingTimer = null;
    }
  };
  const onWaiting = () => {
    if (destroyed || !hasPlayedOnce) {
      return;
    }
    clearWaitingTimer();
    const startTime = el.currentTime;
    waitingTimer = window.setTimeout(() => {
      waitingTimer = null;
      if (destroyed) {
        return;
      }
      // 1 秒内还没恢复播放（currentTime 仍未推进）→ 判定断流
      if (el.currentTime === startTime) {
        console.warn('[LivePlayer] waiting timeout: 1s no progress, treating as stream ended');
        void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
      }
    }, 1 * 1000);
  };
  const onPlaying = () => {
    hasPlayedOnce = true;
    clearWaitingTimer();
  };
  el.addEventListener('waiting', onWaiting);
  el.addEventListener('playing', onPlaying);

  const cleanupVideoListeners = () => {
    el.removeEventListener('timeupdate', onTimeUpdate);
    el.removeEventListener('ended', onEnded);
    el.removeEventListener('waiting', onWaiting);
    el.removeEventListener('playing', onPlaying);
    clearWaitingTimer();
  };

  try {
    const handle = await createStreamPlayer(el, playUrl, {
      muted: false,
      onError: handleStreamError,
      onVideoError: (err) => {
        if (destroyed) {
          return;
        }
        const code = err?.code ?? 'unknown';
        console.warn('[LivePlayer] video element error, code:', code);
        errorText.value = '直播已结束或拉流失败';
        // MEDIA_ERR_SRC_NOT_SUPPORTED / NETWORK_ERR 都是真的停播
        if (code === 4 || code === 2 || code === 1) {
          void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
        }
      },
      onStalled: () => {
        if (destroyed) {
          return;
        }
        console.warn('[LivePlayer] video stalled');
        errorText.value = '直播已结束或拉流失败';
        // stalled 后 1 秒内没恢复则退出
        const stalledTimer = window.setTimeout(() => {
          if (!destroyed) {
            void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
          }
        }, 1 * 1000);
        // 恢复播放时取消这个 timer
        const onStalledRecovered = () => {
          window.clearTimeout(stalledTimer);
          el.removeEventListener('playing', onStalledRecovered);
        };
        el.addEventListener('playing', onStalledRecovered);
      },
    });
    // 播放器初始化期间页面已退出时立即回收
    if (destroyed) {
      handle.destroy();
      cleanupVideoListeners();
      return;
    }
    playerHandle = handle;
    // 自动播放被拦截时会自动静音，这里同步按钮状态
    muted.value = el.muted;
    // 启动停滞兜底计时器
    lastVideoTime = el.currentTime;
    resetStallTimer();
    console.log('[LivePlayer] stall watchdog started, timeout:', STALL_TIMEOUT_MS, 'ms');
  } catch (error) {
    console.error('[LivePlayer] play failed:', error);
    errorText.value = '直播播放失败';
    cleanupVideoListeners();
    // 初始化就失败（URL 无效 / 404）直接退出
    void exitRoom('直播已结束', '主播已结束直播或直播地址无效', true);
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

/** 重新从 route.query / history.state 读取直播间元信息（let 变量 watch 时复用） */
function refreshRouteBoundVars() {
  title = String(route.query.liveTitle || '');
  anchorName = String(route.query.anchorName || '');
  viewerCount.value = String(route.query.viewerCount || '0');
  roomId = String(route.query.roomId || '');
  liveIndexId = String(route.query.liveId || '');
  anchorId = Number(route.query.anchorId || 0);
  playUrl = String((window.history.state as Record<string, unknown> | null)?.playUrl || '');
}

/** 初始化所有直播模块（播放器 / IM / TRTC / 状态轮询） */
async function initLiveModules() {
  // 1. 重置 let 变量到新房间的参数 + UI 状态
  refreshRouteBoundVars();
  errorText.value = '';
  imReady.value = false;
  chatHint.value = '聊天连接中...';
  destroyed = false;
  _cleanupStarted = false;
  missingFromListCount = 0;
  streamErrorCount = 0;

  // 2. IM 事件订阅（cleanup 时 unsubscribe，这里确保重新注册）
  if (!unsubscribeSystem) {
    unsubscribeSystem = onLiveImSystem((event) => {
      void handleSystemEvent(event);
    });
  }
  if (!unsubscribeMembers) {
    unsubscribeMembers = onLiveImMembers((members) => {
      audienceMembers.value = members;
    });
  }

  // 3. 播放器 + IM + TRTC + 状态轮询
  void startPlayback();
  void initChat();
  void initTrtc();
  startLiveStatusPoll();
}

onMounted(() => {
  initSignalScene();
  void initLiveModules();
});

/**
 * 同路由切房间（MoreLiveTray 选另一个直播间）：
 *  先彻底清理旧房间的所有状态（IM / TRTC / FLV / 定时器），
 *  再按新的 route.query 重新 init 所有模块。
 *  组件本身不 reload，用户不会看到白屏闪烁。
 */
watch(
  () => route.query.liveId,
  async (newId, oldId) => {
    if (!newId || newId === oldId) return;
    console.log('[LivePlayer] switch live room:', oldId, '->', newId);
    await doFullCleanup(true);
    await initLiveModules();
  },
);

// 标志位：确保 cleanup 只跑一次（handleBack / onBeforeRouteLeave / onBeforeUnmount 都会调）
let _cleanupStarted = false;

/**
 * onBeforeRouteLeave：路由离开前阻塞等待 doFullCleanup 完成（兜底，handleBack 已经先 await 过）
 */
onBeforeRouteLeave(async () => {
  await doFullCleanup();
  return true;
});

onBeforeUnmount(() => {
  // 兜底：Electron 关窗口等不走路由钩子的场景
  void doFullCleanup();
});
</script>

<style lang="scss" scoped>
.live-player-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  color: var(--text-color-primary, #ffffff);
  background: radial-gradient(circle at 35% 0%, #101a2b 0%, #070b13 48%, #04060b 100%);
  box-sizing: border-box;
}

.player-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 3rem;
  padding: 0 0.875rem 0 1rem;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background: linear-gradient(180deg, rgba(18, 27, 43, 0.98), rgba(9, 14, 24, 0.96));
  border-bottom: 1px solid rgba(105, 211, 255, 0.1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.28), inset 0 1px rgba(255, 255, 255, 0.035);
  box-sizing: border-box;
}

.player-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  -webkit-app-region: no-drag;

  .player-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    color: #fff;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 0.25rem;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .player-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(242, 249, 255, 0.96);
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.player-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  -webkit-app-region: no-drag;

  .player-viewers {
    height: 30px;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    color: rgba(208, 229, 241, 0.72);
    background: rgba(91, 171, 211, 0.06);
    border: 1px solid rgba(127, 209, 241, 0.09);
    border-radius: 999px;

    &::before {
      width: 0.3125rem;
      height: 0.3125rem;
      content: '';
      background: #52e2ef;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(82, 226, 239, 0.65);
    }
  }

  .window-tool {
    display: flex;
    align-items: center;

    .window-tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      margin: 0;
      color: #fff;
      cursor: pointer;
      background: transparent;
      border: none;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.player-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background-color: #02050c;
}

.player-stage {
  position: relative;
  isolation: isolate;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(ellipse at center, #07101e 0%, #02060e 58%, #010308 100%);
}

.player-signal-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.player-side {
  position: relative;
  flex: none;
  width: 30rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(14, 22, 36, 0.99), rgba(7, 11, 20, 0.99));
  border-left: 1px solid rgba(105, 211, 255, 0.12);
  box-shadow: -16px 0 42px rgba(0, 0, 0, 0.3), inset 1px 0 rgba(255, 255, 255, 0.025);
}

.player-side-hint {
  margin: auto;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  text-align: center;
  color: rgba(196, 220, 235, 0.52);
  background: rgba(89, 160, 199, 0.05);
  border: 1px solid rgba(114, 195, 234, 0.08);
  border-radius: 0.75rem;
}

.player-video {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: transparent;
}

.player-stage :deep(.cogrid) {
  z-index: 5;
}

.player-status {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 30;
  transform: translate(-50%, -50%);
  padding: 0.625rem 1rem;
  font-size: 0.8125rem;
  color: #fff;
  background: rgba(7, 14, 25, 0.78);
  border: 1px solid rgba(127, 211, 245, 0.14);
  border-radius: 0.625rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
}

.player-anchor {
  position: absolute;
  left: 1rem;
  top: 0.75rem;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.75rem;
  background: linear-gradient(135deg, rgba(17, 29, 45, 0.76), rgba(7, 13, 24, 0.62));
  border: 1px solid rgba(126, 216, 249, 0.15);
  border-radius: 1rem;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.3), inset 0 1px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px) saturate(1.25);

  /* 头像列：头像（含直播中角标）+ 人气榜入口 */
  .player-anchor-side {
    position: relative;
    margin-top: 18px;
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
  }

  .player-avatar-wrap {
    position: relative;
    width: 2rem;
    height: 2rem;
  }

  .player-avatar {
    width: 2rem;
    height: 2rem;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(100, 226, 255, 0.42);
    border-radius: 50%;
    box-shadow: 0 0 16px rgba(49, 211, 241, 0.13);
    box-sizing: border-box;
  }

  .player-avatar-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
  }

  /* 直播中：压在头像底部 */
  .player-live-badge {
    position: absolute;
    left: 50%;
    bottom: -0.25rem;
    padding: 0 0.25rem;
    font-size: 0.5625rem;
    line-height: 0.75rem;
    color: #fff;
    white-space: nowrap;
    border-radius: 0.25rem;
    background-color: #f04142;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
    transform: translateX(-50%);
  }

  /* 人气榜入口 */
  .player-popularity {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0 0.25rem;
    font-size: 0.5625rem;
    line-height: 0.875rem;
    color: #ffd666;
    cursor: pointer;
    background-color: rgba(255, 214, 102, 0.12);
    border: none;
    border-radius: 0.25rem;

    &:hover {
      background-color: rgba(255, 214, 102, 0.24);
    }
  }

  .player-anchor-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* 主播头像 / 昵称可点击，弹出主播信息卡 */
  .player-anchor-info.is-clickable,
  .player-avatar-wrap.is-clickable {
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.85;
    }
  }

  .player-anchor-name {
    font-size: 0.8125rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-anchor-sub {
    max-width: 16rem;
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 关注按钮 */
  .player-follow-btn {
    flex: none;
    padding: 0 0.625rem;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.375rem;
    color: #fff;
    cursor: pointer;
    background-image: linear-gradient(100deg, #ff6cae, #ff3d78 58%, #ee3965);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 0.75rem;
    box-shadow: 0 5px 16px rgba(255, 61, 113, 0.2);

    &:hover {
      filter: brightness(1.08);
    }

    &:disabled {
      cursor: default;
      opacity: 0.7;
    }

    /* 已关注：弱化为描边态 */
    &.is-followed {
      color: rgba(255, 255, 255, 0.7);
      background-image: none;
      background-color: rgba(255, 255, 255, 0.12);
    }
  }
}

/* ==================== 视频右上角容器（声音 + 在线观众） ==================== */
.player-top-right {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.375rem;
}

/* 声音开关 + 在线观众同一行，更多直播在其下方 */
.player-top-right-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem;
  background: rgba(7, 14, 25, 0.58);
  border: 1px solid rgba(126, 216, 249, 0.12);
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24), inset 0 1px rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px) saturate(1.2);
}

.player-more-live {
  position: relative;
}

.player-more-live-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  color: #fff;
  cursor: pointer;
  background-color: rgba(19, 31, 47, 0.72);
  border: 1px solid rgba(137, 213, 241, 0.14);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background-color: rgba(31, 49, 69, 0.86);
    border-color: rgba(137, 213, 241, 0.26);
  }
}

.player-rank-btn {
  flex: none;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(135deg, rgba(255, 122, 162, 0.9), rgba(255, 61, 113, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  box-shadow: 0 5px 18px rgba(255, 61, 113, 0.17);
  backdrop-filter: blur(12px);
  transition: filter 0.2s ease, transform 0.12s ease;

  &:hover {
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.94);
  }
}

.player-sound-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background-color: rgba(19, 31, 47, 0.72);
  border: 1px solid rgba(137, 213, 241, 0.14);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.12s ease;

  &:hover {
    background-color: rgba(31, 49, 69, 0.86);
    border-color: rgba(137, 213, 241, 0.26);
  }

  &:active {
    transform: scale(0.92);
  }
}

/* ==================== 在线观众折叠组件 ==================== */
.player-audience {
  position: relative;
}

.player-audience-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.625rem 0 0.375rem;
  cursor: pointer;
  background-color: rgba(19, 31, 47, 0.72);
  border: 1px solid rgba(137, 213, 241, 0.14);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background-color: rgba(31, 49, 69, 0.86);
    border-color: rgba(137, 213, 241, 0.26);
  }
}

.player-audience-avatars {
  display: flex;
  align-items: center;
}

.player-audience-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(0, 0, 0, 0.6);
  box-sizing: border-box;

  & + .player-audience-avatar {
    margin-left: -0.5rem;
  }
}

.player-audience-avatar-initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
  background-color: var(--uikit-color-primary, #2b7fff);
}

.player-audience-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
</style>

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
          <span class="player-viewers">{{ viewerCount }} 人观看</span>
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
        <div class="player-stage">
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
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UIKitProvider, TUIMessageBox } from '@tencentcloud/uikit-base-component-vue3';
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

const route = useRoute();
const router = useRouter();

const title = String(route.query.liveTitle || '');
const anchorName = String(route.query.anchorName || '');
const viewerCount = String(route.query.viewerCount || '0');
const avatarRaw = String(route.query.avatar || '');
const avatar = avatarRaw ? resolveImageUrl(avatarRaw) : '';
// IM 群组 ID（后端 room_id）与直播场次 ID（live_index_id）
const roomId = String(route.query.roomId || '');
const liveIndexId = String(route.query.liveId || '');
// 人气榜 / 在线观众接口需要数字类型的场次 ID
const liveIndexIdNumber = computed(() => Number(liveIndexId) || undefined);
// 主播用户 ID：关注接口的 attentionUserId
const anchorId = Number(route.query.anchorId || 0);
// play_url 带签名参数，通过 history.state 传递（H5 项目同样做法）
const playUrl = String((window.history.state as Record<string, unknown> | null)?.playUrl || '');

const { login } = useLoginState();

const videoEl: Ref<HTMLVideoElement | null> = ref(null);
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
    const onEnterRoom = (result: number) => {
      trtcCloud.off('onEnterRoom', onEnterRoom);
      if (result >= 0) {
        trtcEntered = true;
        trtcReady.value = true;
        resolve(result);
      } else {
        reject(new Error(`TRTC enterRoom failed, code: ${result}`));
      }
    };
    trtcCloud.on('onEnterRoom', onEnterRoom);
    // 绑定远端事件
    trtcCloud.on('onRemoteUserVideoAvailable', onRemoteUserVideoAvailable);
    trtcCloud.on('onRemoteUserEnterRoom', onRemoteUserEnterRoom);
    trtcCloud.enterRoom(params, TRTCAppScene.TRTCAppSceneLIVE);
  });
}

function cleanupTrtc() {
  if (!trtcEntered) return;
  try {
    // 停所有远端视图
    remoteUserStates.forEach((_state, uid) => stopRemoteViewSafe(uid));
    trtcCloud.off('onRemoteUserVideoAvailable', onRemoteUserVideoAvailable);
    trtcCloud.off('onRemoteUserEnterRoom', onRemoteUserEnterRoom);
    trtcCloud.exitRoom();
  } catch (e) {
    console.warn('[LivePlayer] trtc cleanup failed:', e);
  }
  trtcEntered = false;
  trtcReady.value = false;
  trtcAnchorUserId.value = '';
  guestUsers.value = [];
  remoteUserStates.clear();
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

function exitTrtc() {
  cleanupTrtc();
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
    .then(() => window.location.reload());
}

// 在线观众折叠组件：群消息 audience_list 下发的成员列表（liveIm 内已做解析）
const audienceMembers = ref<LiveImMember[]>([]);
const audiencePanelVisible = ref(false);
// 叠层最多展示 5 个头像，多出的只体现在人数上
const audiencePreview = computed(() => audienceMembers.value.slice(0, 5));
const audienceCountText = computed(() => (
  audienceMembers.value.length > 0 ? String(audienceMembers.value.length) : viewerCount
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
    const exists = result.list.some(
      (item) => item.roomId === roomId || (liveIndexId !== '' && item.liveIndexId === liveIndexId),
    );
    // 只有返回不足一页的完整列表时，才能确定「不在列表里 == 已下播」
    const complete = result.list.length < LIVE_STATUS_PAGE_SIZE;
    if (exists || !complete) {
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
  playerHandle?.destroy();
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
 * - 同一窗口内之后去开播时，TUILiveKitWin 会检测到已登录并复用会话，避免重复登录互踢。
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

function handleBack() {
  router.push({ name: 'anchor-list' });
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

onMounted(() => {
  unsubscribeSystem = onLiveImSystem((event) => {
    void handleSystemEvent(event);
  });
  unsubscribeMembers = onLiveImMembers((members) => {
    audienceMembers.value = members;
  });
  void startPlayback();
  void initChat();
  // TRTC 独立连麦宫格：以观众身份进房，拉取连麦观众独立视频流
  void initTrtc();
  // 每 2 秒对比在播列表，主播关播后 2~4 秒内必定退出（不依赖拉流错误事件）
  startLiveStatusPoll();
});

onBeforeUnmount(() => {
  destroyed = true;
  stopLiveStatusPoll();
  // 离开直播间（含手动点返回）时关闭本次打开的游戏窗口
  try {
    window.ipcRenderer?.send('close-game-mobile', null);
  } catch {
    // 忽略 IPC 异常
  }
  if (streamErrorTimer) {
    clearTimeout(streamErrorTimer);
    streamErrorTimer = null;
  }
  streamErrorCount = 0;
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  lastVideoTime = 0;
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  unsubscribeMembers?.();
  unsubscribeMembers = null;
  playerHandle?.destroy();
  playerHandle = null;
  // 退出直播间时离开 IM 群；保留 IM 登录态，去开播时直接复用同一会话
  void leaveLiveChat();
  // TRTC 独立连麦宫格：退出房间
  exitTrtc();
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
  background-color: #0b0b0d;
  box-sizing: border-box;
}

.player-header {
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
    font-size: 0.75rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
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
  background-color: #000;
}

.player-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #000;
}

.player-side {
  flex: none;
  width: 20rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color-topbar, #141518);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.player-side-hint {
  margin: auto;
  padding: 0 1rem;
  font-size: 0.75rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
}

.player-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.player-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: #fff;
  border-radius: 0.375rem;
  background-color: rgba(0, 0, 0, 0.6);
}

.player-anchor {
  position: absolute;
  left: 1rem;
  top: 0rem;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  background-color: rgba(0, 0, 0, 0.45);

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
    border-radius: 50%;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.15);
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
    background-image: linear-gradient(90deg, #ff6a9c, #ff3d71);
    border: none;
    border-radius: 0.75rem;

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
  gap: 0.5rem;
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
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
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
  backdrop-filter: blur(4px);
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
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s ease, transform 0.12s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
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
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
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

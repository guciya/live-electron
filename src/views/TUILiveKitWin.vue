<template>
  <UIKitProvider theme="dark">
    <div class="tui-livekit-win" :class="{ 'is-logout-transitioning': isGoingToLoginPage }">
      <div v-if="!loginReady" class="login-loading">
        <span class="login-loading-text">{{ t('Logging In') }}</span>
      </div>
      <template v-else>
      <LiveHeader
        ref="headerRef"
        @logout="handleLogout"
        @back-to-list="handleBackToList"
        :is-showing-in-child-window="true"
        show-entrances
        @open-follow-list="followListVisible = true"
        @open-message="handleOpenMessage"
      />
      <div class="live-pusher-main">
        <div class="main-left">
          <div class="main-left-top">
            <div class="main-left-top-title card-title">
              <div class="title-text">
                {{ t('Video Source') }}
              </div>
            </div>
            <div class="main-left-top-content">
                <LiveScenePanel />
            </div>
          </div>
          <div class="main-left-bottom">
            <div class="main-left-bottom-header">
              <div class="main-left-bottom-title">
                {{ t('Live tool') }}
              </div>
              <div
                class="main-left-bottom-fold"
                @click="isToolsExpanded = !isToolsExpanded"
              >
                <IconArrowStrokeSelectDown
                  class="arrow-icon"
                  :class="{ expanded: isToolsExpanded, collapsed: !isToolsExpanded }"
                />
                <span>{{ isToolsExpanded ? t('Close') : t('Expand') }}</span>
              </div>
            </div>
            <div
              v-show="isToolsExpanded"
              class="main-left-bottom-tools"
            >
              <!-- 连麦 / PK 均走后端「查询开播主播」列表，对齐 web-obs-live / H5 逻辑 -->
              <button
                class="niko-tool-btn"
                type="button"
                :disabled="!isInLive || loading"
                @click="openLinkMicDialog"
              >
                <svg class="niko-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.8" />
                  <circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="1.8" />
                  <path d="M10.2 10.2l3.6 3.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
                <span class="niko-tool-label">连麦</span>
              </button>
              <button
                class="niko-tool-btn"
                type="button"
                :class="{ 'is-pk-active': !!(currentBattleInfo?.battleId || demoPkActive) }"
                :disabled="!isInLive || loading"
                @click="handlePkClick"
              >
                <svg class="niko-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6.4 3.6l4.2 4.2-2.6 2.6L3.8 6.2z" fill="currentColor" opacity=".9" />
                  <path d="M17.6 3.6l4.2 4.2-2.6 2.6-4.2-4.2z" fill="currentColor" opacity=".9" />
                  <path d="M8 16l6-6M10 19l6-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                  <path d="M4.2 16.2l3.6 3.6M16.2 16.2l3.6 3.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                </svg>
                <span class="niko-tool-label">{{ (currentBattleInfo?.battleId || demoPkActive) ? '结束PK' : 'PK' }}</span>
              </button>
              <MusicButton :isShowingInChildWindow="true" />
              <!-- 退出连线：只在连线或 PK 中显示 -->
              <button
                v-if="coHostConnected || pkActive"
                class="niko-tool-btn niko-tool-btn-danger"
                type="button"
                :disabled="!isInLive || loading"
                @click="handleExitConnection"
              >
                <svg class="niko-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4.6 4.6l14.8 14.8M19.4 4.6L4.6 19.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                </svg>
                <span class="niko-tool-label">退出连线</span>
              </button>
            </div>
          </div>
        </div>
        <div class="main-center">
          <div class="main-center-top">
            <div class="main-center-top-left">
              <span class="live-title" :title="currentLive?.liveName || liveParams.liveName">
                {{ currentLive?.liveName || liveParams.liveName }}
              </span>
              <!-- <LiveSettingButton
                v-if="loginUserInfo?.userId && !isGoingToLoginPage"
                :live-name="liveParams.liveName"
                :cover-url="liveParams.coverUrl"
                @confirm="showLiveSettingChildWindow"
                :isShowingInChildWindow="true"
              /> -->
              <LiveURLCopy
                v-if="isInLive && !isGoingToLoginPage"
                :live-id="currentLive?.liveId"
              />
              <!-- 人气榜入口：直播标题右侧 -->
              <button
                class="pusher-rank-btn"
                type="button"
                title="人气榜"
                aria-label="人气榜"
                :disabled="!isInLive"
                @click.stop="popularityPanelVisible = true"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                  <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.5A6.5 6.5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A6.5 6.5 0 0 1 7.5 12H7a4 4 0 0 1-4-4V5h3V3zm0 4H5v1a2 2 0 0 0 1.2 1.8A6.6 6.6 0 0 1 6 7zm12 0a6.6 6.6 0 0 1-.2 1.8A2 2 0 0 0 19 7V7h-1z" />
                </svg>
                <span>人气榜</span>
              </button>
              <span class="live-start-time">开播时长：{{ liveDurationText }}</span>
            </div>
            <button
              class="more-live-btn"
              type="button"
              @click="toggleMoreLive"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6" />
                <path d="M8 21h8M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              更多直播
            </button>
            <div class="main-center-top-right">
              {{ displayAudienceCount }} {{ t('People watching') }}
            </div>
          </div>
          <div ref="centerRef" class="main-center-center">
            <div v-if="pkActive" class="pk-overlay">
              <div class="pk-bar">
                <div class="pk-side pk-left">
                  <span class="pk-score">{{ battleScoreMap.get(loginUserInfo?.userId) || 0 }}</span>
                </div>
                <div class="pk-progress">
                  <div class="pk-progress-inner" :style="{ width: pkProgressPercent + '%' }"></div>
                  <span class="pk-countdown">{{ pkCountdown }}s</span>
                </div>
                <div class="pk-side pk-right">
                  <span class="pk-score">{{ pkOpponentScore }}</span>
                </div>
              </div>
            </div>
            <!-- 本地混流预览用 Embedded 模式（windowId=0）直接渲染成 DOM：画面零延迟，
                 不再是原生窗口，所以礼物特效 / 用户卡片 / 弹窗都能正常盖在视频上 -->
            <!-- 主播 + 连线嘉宾统一布局：0人主播满屏，1人左右等分，2人及以上主播占2/3、嘉宾在右侧堆叠 -->
            <div class="video-layout" :class="[videoLayoutClass, orientationClass]">
              <div class="video-cell video-cell-host">
                <StreamMixer
                  v-if="nativeId !== null && !isGoingToLoginPage && mixerActive"
                  :windowId="0"
                  @on-user-on-seat-info-changed="onUserOnSeatInfoChanged"
                  @on-stream-layout-changed="onStreamLayoutChanged"
                  @on-stream-layout-area-changed="onStreamLayoutAreaChanged"
                />
              </div>
              <div v-if="remoteGuestUsers.length" class="guest-column">
                <div v-for="u in remoteGuestUsers" :key="u.userId" class="video-cell video-cell-guest">
                  <div :id="guestViewId(u.userId)" class="host-guest-video"></div>
                  <span class="host-guest-name">{{ u.nickName || u.userId }}</span>
                  <button
                    class="guest-audio-btn"
                    :class="{ 'is-muted': guestAudioMuted[u.userId] }"
                    type="button"
                    :title="guestAudioMuted[u.userId] ? '打开对方声音' : '关闭对方声音'"
                    @click.stop="toggleGuestAudio(u.userId)"
                  >
                    <svg v-if="guestAudioMuted[u.userId]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path d="M16.4 8.6l5.2 6.8M21.6 8.6l-5.2 6.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.6a8 8 0 0 1 0 10.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <GiftEffect v-if="isInLive" />
            <!-- 更多直播：与观众端一致的底部横滑长条弹窗（自带拉流预览） -->
            <MoreLiveTray
              :visible="moreLiveVisible"
              @close="moreLiveVisible = false"
              @select="handleMoreLiveSelect"
            />
          </div>
          <div class="main-center-bottom">
            <div class="main-center-bottom-content">
              <div class="main-center-bottom-left">
                <MicVolumeSetting />
                <SpeakerVolumeSetting />
                <div class="main-center-bottom-tools">
                  <OrientationSwitch />
                  <SettingButton :isShowingInChildWindow="true"/>
                </div>
              </div>
              <div class="main-center-bottom-right">
                <TUIButton
                  v-if="!isInLive"
                  type="primary"
                  :disabled="loading || isGoingToLoginPage"
                  @click="handleStartLive"
                >
                  <IconLiveLoading
                    v-if="loading"
                    class="loading-icon"
                  />
                  <IconLiveStart v-else />
                  {{ t('Start live') }}
                </TUIButton>
                <TUIButton
                  v-else
                  color="red"
                  :disabled="loading || isGoingToLoginPage"
                  @click="showEndLiveConfirmWindow"
                >
                  <IconLiveLoading
                    v-if="loading"
                    class="loading-icon"
                  />
                  <IconEndLive v-else />
                  {{ t('End live') }}
                </TUIButton>
              </div>
            </div>
          </div>
        </div>
        <div class="main-right">
          <div class="main-right-top">
            <div class="main-right-top-title card-title">
              <div class="title-text">
                {{ t('Online viewers') }}
              </div>
              <div class="title-count">
                ({{ displayAudienceCount }})
              </div>
            </div>
            <AudiencePanel
              docked
              :visible="true"
              :live-index-id="liveIndexIdNumber"
              @count-change="onAudienceCountChange"
            />
          </div>
          <div class="main-right-bottom">
            <div class="main-right-bottom-header">
              <div class="main-right-bottom-title card-title">
                {{ t('Barrage list') }}
              </div>
            </div>
            <div class="message-list-container">
              <LiveChatPanel
                :room-id="nikoRoomId"
                :live-index-id="pendingPreLiveId"
                :disabled="!isInLive"
                @user-click="handleUserClick"
              />
            </div>
          </div>
        </div>
        <LivePusherNotification />
        <!-- 用户信息卡片：视频已是 DOM，可正常盖在视频上 -->
        <UserInfoCard
          :visible="userCardVisible"
          :info="userCardInfo"
          :loading="userCardLoading"
          @close="userCardVisible = false"
        />
        <PreLiveDialog
          v-model:visible="showPreLiveDialog"
          @confirm="onPreLiveConfirm"
        />
        <PkInviteDialog
          v-model:visible="showPkDialog"
          :title="pkDialogTitle"
          :pk-id="currentPkId"
          @invited="onPkInvited"
        />

        <!-- 被别人邀请连线：接受 / 拒绝 -->
        <div v-if="incomingPkInvite" class="niko-pk-incoming-mask">
          <div class="niko-pk-incoming">
            <div class="niko-pk-incoming-avatar">
              <img v-if="incomingPkInvite.avatar" :src="incomingPkInvite.avatar" alt="" />
              <span v-else>{{ (incomingPkInvite.nickname || '主播').slice(0, 1) }}</span>
            </div>
            <div class="niko-pk-incoming-title">
              {{ incomingPkInvite.nickname || '对方主播' }} 邀请你连线
            </div>
            <div class="niko-pk-incoming-tip">倒计时 {{ incomingPkCountdown }}s 后自动关闭</div>
            <div class="niko-pk-incoming-actions">
              <button class="niko-pk-incoming-btn is-reject" type="button" @click="replyIncomingPkInvite(0)">拒绝</button>
              <button class="niko-pk-incoming-btn is-accept" type="button" @click="replyIncomingPkInvite(1)">接受</button>
            </div>
          </div>
        </div>

        <!-- 关注列表：/live/anchorPrepareWhitelist（type=2 关注）用户列表 -->
        <FollowListDialog
          :visible="followListVisible"
          @close="followListVisible = false"
          @select="openFollowUserCard"
        />

        <!-- 消息中心：基于 TUIChatEngine C2C 单聊 -->
        <MessageCenter
          :visible="messageCenterVisible"
          @close="handleCloseMessageCenter"
        />

        <!-- 关播结算（对齐 web-obs-live 的结算层） -->
        <div v-if="settleStats" class="niko-settle-mask">
          <div class="niko-settle-card">
            <div class="niko-settle-header">直播已结束</div>
            <div class="niko-settle-hero">
              <div class="niko-settle-hero-value">{{ settleStats.kTicket }}</div>
              <div class="niko-settle-hero-label">本场K票</div>
            </div>
            <div class="niko-settle-row">
              <div class="niko-settle-item">
                <div class="niko-settle-item-value">{{ settleStats.liveDuration }}</div>
                <div class="niko-settle-item-label">直播时长</div>
              </div>
              <div class="niko-settle-item">
                <div class="niko-settle-item-value">{{ settleStats.audienceCount }}</div>
                <div class="niko-settle-item-label">观看人数</div>
              </div>
              <div class="niko-settle-item">
                <div class="niko-settle-item-value">{{ settleStats.newFansCount }}</div>
                <div class="niko-settle-item-label">新增粉丝</div>
              </div>
            </div>
            <div class="niko-settle-footer">
              <button type="button" class="niko-settle-btn niko-settle-btn--primary" @click="handleRestartLive">重新开播</button>
              <button type="button" class="niko-settle-btn niko-settle-btn--ghost" @click="handleCloseSettle">关闭</button>
            </div>
          </div>
        </div>
      </div>
      </template>

      <!-- 人气榜弹窗（覆盖整个开播页） -->
      <PopularityRankPanel
        :visible="popularityPanelVisible"
        :live-index-id="liveIndexIdNumber"
        :anchor-name="loginUserInfo?.userName || ''"
        :anchor-avatar="loginUserInfo?.avatarUrl || ''"
        @close="popularityPanelVisible = false"
      />
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import { TRTCVideoMirrorType, TRTCParams, TRTCAppScene, TRTCRoleType, TRTCVideoFillMode } from 'trtc-electron-sdk';
import { releaseMediaResourcesBeforeQuit } from '../TUILiveKit/utils/appQuitCleanup';
import TUIRoomEngine, { TUISeatMode, TUIRoomType, TRTCMediaSourceType, TUIRoomEvents, TUIVideoStreamType, TUIResolutionMode } from '@tencentcloud/tuiroom-engine-electron';
import {
  UIKitProvider,
  useUIKit,
  TUIButton,
  IconLiveLoading,
  IconLiveStart,
  IconEndLive,
  IconArrowStrokeSelectDown,
} from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../TUILiveKit/base-component/MessageToast';
import {
  LiveAudienceList,
  BarrageList,
  BarrageInput,
  useLoginState,
  useLiveListState,
  useLiveAudienceState,
  useDeviceState,
  useCoGuestState,
  useCoHostState,
  useBattleState,
  useLiveSeatState,
  useVideoMixerState,
  MediaSource,
  CoHostStatus,
  StreamMixer,
  LiveListEvent,
  LiveEndedReason,
  LiveListEventInfo,
  BattleEvent,
} from 'tuikit-atomicx-vue3-electron';
import { useElectronLogin, type ForceLogoutNoticePayload } from '../TUILiveKit/hooks/useElectronLogin';
import { releaseBeautyResourcesOnLogout } from '../TUILiveKit/utils/beautyLogoutCleanup';
import LiveHeader from '../TUILiveKit/components/LiveHeader/index.vue';
import LiveScenePanel from '../TUILiveKit/components/LiveScenePanel/index.vue';
import LiveSettingButton from '../TUILiveKit/components/LiveSettingButton.vue';
import LiveURLCopy from '../TUILiveKit/components/LiveURLCopy.vue';
import LivePusherNotification from '../TUILiveKit/components/LivePusherNotification.vue';
import LiveChatPanel from '../niko/components/LiveChatPanel.vue';
import AudiencePanel from '../niko/components/AudiencePanel.vue';
import FollowListDialog from '../niko/components/FollowListDialog.vue';
import MessageCenter from '../niko/components/MessageCenter.vue';
import PopularityRankPanel from '../niko/components/PopularityRankPanel.vue';
import PkInviteDialog from '../niko/components/PkInviteDialog.vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import UserInfoCard from '../niko/components/UserInfoCard.vue';
import {
  joinLiveChat,
  leaveLiveChat,
  onLiveImMessage,
  onLiveImSettle,
  onLiveImSystem,
  onLiveImPkInvite,
  onLiveImPkStarted,
  onLiveImPkEnded,
  type LiveImSystemEvent,
  type LiveSettleStats,
  type LivePkInvite,
  type LivePkStarted,
  type LivePkEnded,
} from '../niko/im/liveIm';
import {
  isNetworkOffline,
  isNetworkTimeoutError,
  isSvgCoverUrl,
  throttle,
} from '../TUILiveKit/utils/utils';
import { getWindowID } from '../TUILiveKit/utils/envUtils';
import { TUIButtonAction, TUIButtonActionType } from '../TUILiveKit/types';
import {
  ipcBridge,
  IPCMessageType,
  ConfirmDialogActionPayload,
  ApplyLiveTitlePayload,
  ChildPanelType,
  WindowType,
  BattleStateSnapshot,
  EndLiveActionValue,
} from '../TUILiveKit/ipc';
import MicVolumeSetting from '../TUILiveKit/components/MicVolumeSetting.vue';
import SpeakerVolumeSetting from '../TUILiveKit/components/SpeakerVolumeSetting.vue';
import OrientationSwitch from '../TUILiveKit/components/OrientationSwitch.vue';
import SettingButton from '../TUILiveKit/components/SettingButton.vue';
import MusicButton from '../TUILiveKit/components/MusicButton.vue';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { useSystemAudioLoopback } from '../TUILiveKit/hooks/useSystemAudioLoopback';
import useRoomEngine from '../TUILiveKit/utils/useRoomEngine';
import { mapToRoomEngineLanguage } from '../TUILiveKit/utils/common';
import { LIVE_NAME_MAX_UTF8_BYTES } from '../TUILiveKit/constants/tuiConstant';
import PreLiveDialog from '../niko/components/PreLiveDialog.vue';
import { stopLive as nikoStopLive, getAudienceCardInfo, getPkAnchorList, invitePk, replyPk } from '../niko/api/live';
import type { PrepareLiveResult, AnchorPrepareWhitelistUser } from '../niko/api/live';
import MoreLiveTray from '../niko/components/MoreLiveTray.vue';

console.log('TRTC SDK version:', trtcCloud.getSDKVersion());

const nativeId = ref<number | Uint8Array | null>(null);
/** 是否挂载 StreamMixer（DOM 混流预览）。关播后卸载，释放混流服务与渲染资源 */
const mixerActive = ref(true);

const router = useRouter();
const { loginUserInfo, login: loginIm } = useLoginState();
const { t, language } = useUIKit();
const loading = ref(false);
const isToolsExpanded = ref(true);

const props = defineProps<{
  liveId?: string;
  liveName?: string;
  seatMode?: TUISeatMode;
}>();

const { currentLive, endLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
const { audienceCount } = useLiveAudienceState();
const { openLocalMicrophone, cameraList, getCameraList } = useDeviceState();
const videoMixerState = useVideoMixerState();
const { connected: coGuestConnected } = useCoGuestState();
const { connected: coHostConnected, coHostStatus, exitHostConnection } = useCoHostState();
const {
  currentBattleInfo,
  battleUsers,
  battleScore,
  requestBattle,
  exitBattle,
  subscribeEvent: subscribeBattleEvent,
  unsubscribeEvent: unsubscribeBattleEvent,
} = useBattleState();
const { seatList } = useLiveSeatState();
const roomEngine = useRoomEngine();

// ===== PK 状态 =====
const battleScoreMap = computed(() => battleScore.value || new Map<string, number>());
const pkOpponentScore = computed(() => {
  const selfId = loginUserInfo.value?.userId;
  for (const [uid, score] of battleScoreMap.value.entries()) {
    if (uid !== selfId) return score;
  }
  return 0;
});
const pkProgressPercent = computed(() => {
  const self = battleScoreMap.value.get(loginUserInfo.value?.userId) || 0;
  const opp = pkOpponentScore.value;
  const total = self + opp;
  if (total <= 0) return 50;
  return Math.round((self / total) * 100);
});
const pkCountdown = ref(0);
let pkTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeSettle: (() => void) | null = null;
let unsubscribeSystem: (() => void) | null = null;
let unsubscribeJoinCount: (() => void) | null = null;
let unsubscribePkInvite: (() => void) | null = null;
let unsubscribePkStarted: (() => void) | null = null;
let unsubscribePkEnded: (() => void) | null = null;

/** 收到的 PK / 连麦邀请（被邀请方） */
const incomingPkInvite = ref<LivePkInvite | null>(null);
const incomingPkCountdown = ref(15);
let incomingPkTimer: ReturnType<typeof setInterval> | null = null;

const clearIncomingPkInvite = () => {
  incomingPkInvite.value = null;
  if (incomingPkTimer) {
    clearInterval(incomingPkTimer);
    incomingPkTimer = null;
  }
};

/** 收到别人的连线邀请：展示接受/拒绝弹窗，倒计时结束自动关闭 */
const handlePkInviteReceived = (invite: LivePkInvite) => {
  console.log('[NikoPK] incoming invite:', invite);
  incomingPkInvite.value = invite;
  incomingPkCountdown.value = Math.max(1, Number(invite.waitTimeout) || 15);
  if (incomingPkTimer) {
    clearInterval(incomingPkTimer);
  }
  incomingPkTimer = setInterval(() => {
    incomingPkCountdown.value -= 1;
    if (incomingPkCountdown.value <= 0) {
      clearIncomingPkInvite();
    }
  }, 1000);
};

/** 回复邀请：1 接受 / 0 拒绝（后端 /live/replyPk） */
const replyIncomingPkInvite = async (status: 0 | 1) => {
  const invite = incomingPkInvite.value;
  if (!invite) {
    return;
  }
  try {
    await replyPk(status, invite.pkId);
    showMessage({
      type: MessageToastType.Success,
      message: status === 1 ? '已接受连线邀请' : '已拒绝连线邀请',
    });
  } catch (error: any) {
    console.warn('[NikoPK] reply failed:', error?.message || error);
    showMessage({ type: MessageToastType.Error, message: status === 1 ? '接受失败' : '拒绝失败' });
  } finally {
    clearIncomingPkInvite();
  }
};

/** PK 开始（双方都会收到 action 108）：只有本地主动发起 PK 时才展示 PK 条，
 *  连麦（走同一个 invitePk 接口）接受后服务端同样下发 108，不能误判成 PK */
const handlePkStartedEvent = (event: LivePkStarted) => {
  console.log('[NikoPK] pk started:', event.pkId);
  clearIncomingPkInvite();
  if (!pkIntentActive.value) {
    console.log('[NikoPK] co-host connected (not PK), skip PK bar');
    return;
  }
  if (demoPkActive.value || currentBattleInfo.value?.battleId) {
    return;
  }
  demoPkActive.value = true;
  startPkCountdown(300);
};

/** PK 结束 / 对方退出（action 110） */
const handlePkEndedEvent = (event: LivePkEnded) => {
  console.log('[NikoPK] pk ended:', event.pkId);
  pkIntentActive.value = false;
  demoPkActive.value = false;
  pkCountdown.value = 0;
  if (pkTimer) {
    clearInterval(pkTimer);
    pkTimer = null;
  }
};
/** 禁播/封禁/下播提示弹窗的 dialogId，用于区分普通「结束直播」确认框 */
let liveStopDialogId = '';
let liveStopNoticePending = false;
const startPkCountdown = (seconds: number) => {
  pkCountdown.value = seconds;
  if (pkTimer) clearInterval(pkTimer);
  pkTimer = setInterval(() => {
    pkCountdown.value--;
    if (pkCountdown.value <= 0) {
      if (pkTimer) clearInterval(pkTimer);
      pkTimer = null;
    }
  }, 1000);
};
// 监听 PK 开始/结束，启动/清除倒计时
watch(() => currentBattleInfo.value?.battleId, (battleId, oldId) => {
  if (battleId && !oldId) {
    const duration = currentBattleInfo.value?.config?.duration || 300;
    startPkCountdown(duration);
  } else if (!battleId) {
    if (pkTimer) clearInterval(pkTimer);
    pkTimer = null;
  }
});

const handlePkClick = async () => {
  if (currentBattleInfo.value?.battleId || demoPkActive.value) {
    // 结束 PK（演示效果直接本地清除）
    pkIntentActive.value = false;
    if (demoPkActive.value) {
      demoPkActive.value = false;
      pkCountdown.value = 0;
      return;
    }
    try {
      await exitBattle({ battleId: currentBattleInfo.value.battleId });
    } catch (e) {
      console.warn('[Niko] exitBattle failed:', e);
    }
    return;
  }
  if (!isInLive.value || loading.value) {
    return;
  }
  // 不弹窗：直接查询在播主播并自动邀请第一位；
  // 没有可邀请的主播时，本地触发 PK 血条效果展示
  pkIntentActive.value = true;
  try {
    const result: any = await getPkAnchorList('', 1, 20);
    const list: any[] = Array.isArray(result) ? result : (result?.list ?? result?.data ?? []);
    const selfId = String(loginUserInfo.value?.userId || '');
    const target = list.find((item) => String(item.user_id ?? item.anchor_id) !== selfId);
    if (target) {
      await invitePk(target.user_id ?? target.anchor_id);
      showMessage({ type: MessageToastType.Success, message: '已发送邀请，等待对方接受' });
      return;
    }
  } catch (e) {
    console.warn('[NikoPK] auto invite failed:', e);
  }
  demoPkActive.value = true;
  pkCountdown.value = 300;
};

/** 退出连线（连麦 / PK 都走这个） */
const handleExitConnection = async () => {
  // 1. PK 中：先调 exitBattle
  if (currentBattleInfo.value?.battleId) {
    try {
      await exitBattle({ battleId: currentBattleInfo.value.battleId });
    } catch (e) {
      console.warn('[Niko] exitBattle from exitConnection failed:', e);
    }
  }
  // 2. 连麦状态：退出 Host 连线（后端 + TRTC 清理）
  if (coHostConnected.value) {
    try {
      await exitHostConnection();
      showMessage({ type: MessageToastType.Success, message: '已退出连线' });
    } catch (e) {
      console.warn('[Niko] exitHostConnection failed:', e);
      showMessage({ type: MessageToastType.Error, message: '退出连线失败' });
    }
  }
};

/** PK 演示效果开关：没有在播主播可邀请时本地展示 PK 血条 */
const demoPkActive = ref(false);
/** 本地是否主动发起的是 PK（false 表示走连麦，服务端同样会下发 108，不能展示 PK 条） */
const pkIntentActive = ref(false);
/** PK 进行中：血条盖在视频区顶部 */
const pkActive = computed(() => !!(currentBattleInfo.value?.battleId || demoPkActive.value));

/** 连麦入口：同样走「查询开播主播」列表 */
const openLinkMicDialog = () => {
  if (!isInLive.value || loading.value) {
    return;
  }
  pkIntentActive.value = false;
  pkDialogTitle.value = '连麦';
  showPkDialog.value = true;
};

const onPkInvited = (anchorId: string) => {
  console.log('[NikoPK] invitation sent, anchorId:', anchorId);
  showMessage({ type: MessageToastType.Success, message: '已发送邀请，等待对方接受' });
};

/** 关闭结算面板：恢复开播前的画布调试状态（重新挂载原生预览） */
const handleCloseSettle = () => {
  settleStats.value = null;
  mixerActive.value = true;
  // 注意：这里不预热 camera（不再调 void ensureDefaultCamera()）。
  // camera 添加统一由 onPreLiveConfirm 里的 ensureDefaultCamera 处理，
  // 预热只会和 force-clean 制造 race condition。
};

/** 关闭结算面板后回到预开播弹窗，实现「重新开播」 */
const handleRestartLive = () => {
  settleStats.value = null;
  // 结算层「重新开播」：恢复原生预览窗口挂载
  mixerActive.value = true;
  // 统一走 ensureCameraBeforePreLive：有摄像头直接弹，没有先弹 CameraSettingDialog
  ensureCameraBeforePreLive();
};

/** 统一入口：确保有摄像头后弹 PreLiveDialog */
function ensureCameraBeforePreLive() {
  if (hasCameraInMixer()) {
    showPreLiveDialog.value = true;
    return;
  }
  pendingPreLiveAfterCameraAdd.value = true;
  console.log('[Niko] ensureCameraBeforePreLive: no camera, opening CameraSettingDialog');
  ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
    panelType: ChildPanelType.Camera,
    initialData: {},
  });
}

/** 确认结束直播后是否跳转回主播列表（顶部「返回列表」按钮触发） */
let navigateToListAfterEnd = false;

/** 返回主播列表：直播中先走结束直播确认，确认结束后跳转；未开播直接跳转 */
const handleBackToList = () => {
  if (isInLive.value) {
    navigateToListAfterEnd = true;
    showEndLiveConfirmWindow();
    return;
  }
  router.replace({ name: 'anchor-list' });
};

/** 更多直播：复用观众端 MoreLiveTray，底部横滑长条弹窗（内部自带拉流预览） */
const moreLiveVisible = ref(false);

const toggleMoreLive = () => {
  moreLiveVisible.value = !moreLiveVisible.value;
};

/** 主播端不跳转到其他直播间，点选卡片仅关闭弹窗 */
const handleMoreLiveSelect = () => {
  moreLiveVisible.value = false;
};

/** 关注列表弹窗 */
const followListVisible = ref(false);
/** 消息中心弹窗 */
const messageCenterVisible = ref(false);
/** LiveHeader 实例：关闭消息中心后刷新未读红点 */
const headerRef = ref<any>(null);
function handleCloseMessageCenter() {
  messageCenterVisible.value = false;
  headerRef.value?.refreshMessageUnread?.();
}

/** 点击关注列表里的用户：打开用户资料卡 */
function openFollowUserCard(user: AnchorPrepareWhitelistUser) {
  void handleUserClick({ userId: String(user.user_id), isMystery: false });
}

/** 打开消息中心：开播页本身已登录 IM，这里再兜底补登一次，避免过早点击时 IM 尚未就绪 */
async function handleOpenMessage() {
  try {
    const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (stored) {
      const { sdkAppId, userId, userSig } = JSON.parse(stored);
      // useLoginState().login 内部幂等：已登录且同 userId 直接返回
      await loginIm({
        sdkAppId: Number(sdkAppId),
        userId: String(userId),
        userSig: String(userSig),
      });
    }
    messageCenterVisible.value = true;
  } catch (error: any) {
    console.error('[TUILiveKitWin] open message center failed:', error);
    showMessage({ type: MessageToastType.Error, message: `消息中心打开失败：${error?.message || 'IM 登录失败'}` });
  }
}

// 当前 SDKAppID 未开通直播房间套餐，使用 Conference 类型进房，手动维护直播状态
const nikoIsLive = ref(false);
const isInLive = computed(() => nikoIsLive.value || !!currentLive.value?.liveId);
const isGoingToLoginPage = ref(false);
// 登录完成前不渲染子组件，避免 TRTC 未初始化时拉直播列表/连麦候选报错
const loginReady = ref(false);
// 预开播弹窗（标题/封面/分类/方向）
const showPreLiveDialog = ref(false);
// 等待用户添加摄像头后自动弹 PreLiveDialog 的 flag
// 场景：用户点"开始直播"→ 没摄像头 → 弹 CameraSettingDialog → 用户加完 → 自动弹 PreLiveDialog
const pendingPreLiveAfterCameraAdd = ref(false);
const pendingPreLiveId = ref<string>('');
/** 人气榜弹窗开关 */
const popularityPanelVisible = ref(false);
/** 当前直播场次 id（接口需要 number 类型） */
const liveIndexIdNumber = computed(() => Number(pendingPreLiveId.value) || undefined);
/** 连麦/PK 主播列表弹窗（对齐 web-obs-live：先查开播主播再邀请） */
const showPkDialog = ref(false);
const pkDialogTitle = ref('PK');
const currentPkId = computed(() => String((currentBattleInfo.value as any)?.pkId || ''));
/** 本场开播时间，用于结算面板计算直播时长 */
const liveStartedAt = ref(0);
/** 开播时长（秒）：开播成功后每秒自增 */
const liveDurationSeconds = ref(0);
let liveDurationTimer: ReturnType<typeof setInterval> | null = null;

const stopLiveDurationTimer = () => {
  if (liveDurationTimer) {
    clearInterval(liveDurationTimer);
    liveDurationTimer = null;
  }
};

const startLiveDurationTimer = () => {
  stopLiveDurationTimer();
  liveDurationSeconds.value = 0;
  liveDurationTimer = setInterval(() => {
    liveDurationSeconds.value += 1;
  }, 1000);
};

/** 开播时长展示：00时00分00秒 */
const liveDurationText = computed(() => {
  if (!isInLive.value || !liveStartedAt.value) {
    return '00时00分00秒';
  }
  const total = liveDurationSeconds.value;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}时${minutes}分${seconds}秒`;
});
/** 本场峰值在线人数（来自观众列表快照） */
const peakAudienceCount = ref(0);
/** 本场累计进房人次（来自 IM 101 进房消息；观众列表 15s 轮询会漏掉短停留观众，进房消息更可靠） */
const totalJoinCount = ref(0);
/** 关播结算数据；非空时展示结算层 */
const settleStats = ref<{
  kTicket: string;
  liveDuration: string;
  audienceCount: number;
  newFansCount: number;
} | null>(null);
// IM 群组 ID（= 后端 room_id，与 TRTC 房间号 live_index_id 不同）
const nikoRoomId = ref<string>('');
// 在线人数来自 IM 群成员（TUIRoomEngine 房间不可用，TUIKit 的 audienceCount 恒为 0）
const nikoAudienceCount = ref(0);

/** 视频区 DOM 容器：连线对方主播的 DOM 视频也挂在这里（absolute 定位） */
const centerRef = ref<HTMLElement | null>(null);


/** 用户信息卡片（DOM 展示：视频画布是 DOM，卡片可直接盖在上方） */
const userCardVisible = ref(false);
const userCardLoading = ref(false);
const userCardInfo = ref<any>(null);

/** 对齐 web-obs-live ChatRoom.handleUserClick：按用户 + 直播场次拉取个人信息卡片 */
const handleUserClick = async (payload: { userId: string; isMystery: boolean }) => {
  const audienceUserId = String(payload?.userId || '');
  if (!audienceUserId) {
    return;
  }
  userCardInfo.value = { is_mystery: !!payload.isMystery, user_id: audienceUserId };
  userCardLoading.value = true;
  userCardVisible.value = true;
  try {
    const result = await getAudienceCardInfo({
      audienceUserId,
      liveIndexId: pendingPreLiveId.value || undefined,
    });
    const info = (result as any)?.audience_info || (result as any)?.data?.audience_info || null;
    if (info) {
      userCardInfo.value = { ...info, is_mystery: (info as any).is_mystery ?? payload.isMystery };
    }
  } catch (error: any) {
    console.warn('[NikoLive] getAudienceCardInfo failed:', error?.message || error);
  } finally {
    userCardLoading.value = false;
  }
};

/* ---------------- 连线对方主播（TRTC 远端视图渲染成 DOM） ---------------- */
interface RemoteGuest {
  userId: string;
  nickName?: string;
}

const remoteGuestUsers = ref<RemoteGuest[]>([]);
const guestVideoAvailable = new Set<string>();

/** 远端嘉宾静音状态：key = userId，true 表示已关闭对方声音 */
const guestAudioMuted = ref<Record<string, boolean>>({});

const toggleGuestAudio = (userId: string) => {
  const nextMuted = !guestAudioMuted.value[userId];
  guestAudioMuted.value = { ...guestAudioMuted.value, [userId]: nextMuted };
  roomEngine.instance
    ?.muteRemoteAudioStream({ userId, isMute: nextMuted })
    .catch((error: unknown) => {
      console.warn('[Niko] muteRemoteAudioStream failed:', userId, error);
    });
};

/** 视频区统一布局：0人主播满屏，1人左右等分，2人及以上主播2/3 + 嘉宾右侧堆叠 */
const videoLayoutClass = computed(() => {
  const count = remoteGuestUsers.value.length;
  if (count <= 0) return 'video-layout-host-only';
  if (count === 1) return 'video-layout-split';
  return 'video-layout-side';
});

/** 横屏 / 竖屏样式类：layoutTemplate 200~599 → 横屏，>=600 → 竖屏 */
const orientationClass = computed(() => {
  const tpl = currentLive.value?.layoutTemplate;
  // 未加载时按 SDK 默认（竖屏 600）处理
  return tpl === undefined || tpl >= 600 ? 'is-portrait' : 'is-landscape';
});

/**
 * 根据 layoutTemplate 同步摄像头采集的横竖屏模式。
 * WinLocalMixer 只把分辨率模式同步给了 StreamLayoutService（影响混流画布比例），
 * 但没有调用 roomEngine.setVideoResolutionMode，导致摄像头始终横屏采集，
 * 选竖屏时画面仍是横屏 + 下方黑边。这里补上真正的摄像头分辨率模式切换。
 * layoutTemplate: 200~599 → 横屏，>=600 → 竖屏
 */
const applyCameraResolutionMode = () => {
  const tpl = currentLive.value?.layoutTemplate;
  // 直播信息还没加载时不要强改，SDK 默认就是竖屏(600)，否则会把横屏模式覆盖成默认值
  if (typeof tpl !== 'number') {
    return;
  }
  const isPortrait = tpl >= 600;
  const resolutionMode = isPortrait
    ? TUIResolutionMode.kResolutionMode_Portrait
    : TUIResolutionMode.kResolutionMode_Landscape;
  roomEngine.instance
    ?.setVideoResolutionMode({
      streamType: TUIVideoStreamType.kCameraStream,
      resolutionMode,
    })
    .catch((err: unknown) => {
      console.warn('[Niko] setVideoResolutionMode failed:', err);
    });
};

let previewRegionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 横竖屏切换后重新绑定预览元素。
 * 注意：IPC 模式（windowId = 0）下 SDK 只接受 HTMLElement，传 Rect 会直接
 * 走 previewInNone() 把预览关掉（这就是传 Rect 后画面消失的原因）。
 * 这里重新传元素本身，让 SDK 重新计算 working area / 设计器尺寸。
 */
const applyPreviewRegion = () => {
  try {
    const el = document.querySelector('.video-layout .video-cell-host .local-mixer-content') as HTMLElement | null;
    const mmm = roomEngine.instance?.getTRTCCloud()?.getMediaMixingManager() as any;
    if (!el || !mmm || typeof mmm.bindPreviewArea !== 'function') {
      return;
    }
    mmm.bindPreviewArea(0, el)
      .then(() => {
        patchMediaMixingManager();
        refillCameraSources();
        console.log('[Niko] preview element rebound');
      })
      .catch((error: unknown) => {
        console.warn('[Niko] bindPreviewArea(element) failed:', error);
      });
  } catch (error) {
    console.warn('[Niko] applyPreviewRegion failed:', error);
  }
};

const schedulePreviewRegion = () => {
  if (previewRegionTimer) {
    clearTimeout(previewRegionTimer);
  }
  previewRegionTimer = setTimeout(() => applyPreviewRegion(), 400);
};

// 混流预览挂载后：禁用设计器拖拽 + 劫持布局铺满本地画面
watch(
  () => mixerActive.value,
  (active) => {
    if (active) {
      setTimeout(() => { disableMixerDesigner(); patchMediaMixingManager(); }, 300);
      setTimeout(() => { disableMixerDesigner(); patchMediaMixingManager(); }, 1000);
      setTimeout(() => { disableMixerDesigner(); patchMediaMixingManager(); }, 2000);
    }
  },
  { immediate: true },
);

// layoutTemplate 变化时同步摄像头横竖屏（开播前切换才会生效，开播中 OrientationSwitch 已禁用）
watch(
  () => currentLive.value?.layoutTemplate,
  () => {
    applyCameraResolutionMode();
    // 画布比例随横竖屏变化，已添加的摄像头源 rect 需要重铺，否则会留黑边
    nextTick(() => refillCameraSources());
    // 预览区域按新的横竖屏比例重新绑定
    schedulePreviewRegion();
  },
  { immediate: true },
);

/**
 * 禁用混流设计器的拖拽交互（不销毁 designer，否则 NoneStreamLayoutManager.setLayout
 * 会因 mediaMixingDesigner 为 null / 未初始化而报 "updateWorkingArea no data"，
 * 导致本地预览布局失效、关闭连线后摄像头无法恢复）。
 * 设计器的拖拽遮罩默认 display:none，仅在选中媒体源时出现；这里把它的交互关掉即可。
 */
const disableMixerDesigner = () => {
  try {
    const mmm = roomEngine.instance?.getTRTCCloud()?.getMediaMixingManager() as any;
    const designer = mmm?.mediaMixingDesigner;
    if (designer?.container) {
      // 让设计器容器不接收鼠标事件，避免主播误拖动画面
      designer.container.style.pointerEvents = 'none';
    }
  } catch (error) {
    console.warn('[Niko] disableMixerDesigner failed:', error);
  }
};

// 记录最新的混流布局区域尺寸（CSS 像素），用于把本地用户画面铺满整个预览区
let currentLayoutArea: { width: number; height: number } | null = null;
// NoneStreamLayoutManager.centerLiveOwner 是否已被替换为铺满版本
let centerLiveOwnerPatched = false;

/**
 * 根据 publishVideoQuality + layoutTemplate 计算混流画布的物理尺寸。
 * 与 SDK VideoMixerState 中 V / y 计算保持一致。
 */
function getMixingCanvasSize(): { width: number; height: number } {
  const quality = videoMixerState.publishVideoQuality?.value ?? 4;
  const isPortrait = (currentLive.value?.layoutTemplate ?? 0) >= 600;
  const qualityMap: Record<number, [number, number]> = {
    1: [640, 360],   // 360p
    2: [960, 540],   // 540p
    3: [1280, 720],  // 720p
    4: [1920, 1080], // 1080p
  };
  const [w, h] = qualityMap[quality] || [1920, 1080];
  return isPortrait ? { width: h, height: w } : { width: w, height: h };
}

/**
 * 计算把源画面铺满画布的 rect（裁剪超出部分，不留黑边）。
 * 与 SDK 默认 be() 的“等比缩放+居中留黑边”相反，这里取较大缩放比。
 * rotation 为 TRTCVideoRotation 枚举：0=0°, 1=90°, 2=180°, 3=270°。
 */
function computeFillRect(source: any, canvasW: number, canvasH: number) {
  const srcW = source?.width || 0;
  const srcH = source?.height || 0;
  if (!srcW || !srcH || !canvasW || !canvasH) {
    return null;
  }
  const rotation = source.rotation || 0;
  const rotated = rotation === 1 || rotation === 3; // 90° / 270°
  const effW = rotated ? srcH : srcW;
  const effH = rotated ? srcW : srcH;
  const scale = Math.max(canvasW / effW, canvasH / effH);
  const scaledW = Math.round(effW * scale);
  const scaledH = Math.round(effH * scale);
  return {
    left: Math.round((canvasW - scaledW) / 2),
    top: Math.round((canvasH - scaledH) / 2),
    right: Math.round((canvasW + scaledW) / 2),
    bottom: Math.round((canvasH + scaledH) / 2),
  };
}

/**
 * 把摄像头 / 屏幕共享源的 rect 改为铺满画布。
 * TRTCMediaSourceType: kCamera = 0，kScreen = 1，kImage = 2，kVideoFile = 6。
 * 仅处理 0/1，图片/视频源保持 SDK 默认的等比缩放。
 */
function fillSourceRectIfNeeded(source: any) {
  if (!source || (source.sourceType !== 0 && source.sourceType !== 1)) {
    return;
  }
  const { width: cw, height: ch } = getMixingCanvasSize();
  const fillRect = computeFillRect(source, cw, ch);
  if (fillRect) {
    source.rect = fillRect;
  }
}

/**
 * 重新铺满已添加的摄像头 / 屏幕共享源。
 * 用于：① patch 生效前已添加的源；② 横竖屏切换后画布尺寸变化。
 */
function refillCameraSources() {
  try {
    const mmm = roomEngine.instance?.getTRTCCloud()?.getMediaMixingManager() as any;
    if (!mmm || typeof mmm.updateMediaSource !== 'function') {
      return;
    }
    const sources = videoMixerState.mediaSourceList?.value || [];
    for (const source of sources) {
      if (source && (source.sourceType === 0 || source.sourceType === 1)) {
        mmm.updateMediaSource(source);
      }
    }
  } catch (error) {
    console.warn('[Niko] refillCameraSources failed:', error);
  }
}

/**
 * 替换 NoneStreamLayoutManager.centerLiveOwner：
 * SDK 默认实现会按混流画布比例把本地用户 rect 居中（留黑边）。
 * 这里改为直接撑满整个 displayArea，实现横屏铺满宽度、竖屏铺满高度。
 * 同时劫持 setStreamLayout 作为兜底（自定义布局模式下也强制本地用户 Fill + 满 rect）。
 */
let patchedMediaMixingManager: any = null;
const patchMediaMixingManager = () => {
  try {
    const mmm = roomEngine.instance?.getTRTCCloud()?.getMediaMixingManager() as any;
    if (!mmm) {
      return;
    }
    // 1) 替换 NoneStreamLayoutManager.centerLiveOwner（只做一次）
    if (!centerLiveOwnerPatched && mmm.streamLayoutManager) {
      const proto = Object.getPrototypeOf(mmm.streamLayoutManager);
      if (proto && typeof proto.centerLiveOwner === 'function' && !proto.__nikoPatched) {
        const originalCenterLiveOwner = proto.centerLiveOwner;
        proto.centerLiveOwner = function patchedCenterLiveOwner(this: any) {
          if (this.context && this.layout) {
            const dpr = window.devicePixelRatio || 1;
            const dw = (this.displayArea?.width || 0) * dpr;
            const dh = (this.displayArea?.height || 0) * dpr;
            if (dw > 0 && dh > 0) {
              this.layout.userList = [{
                userId: '',
                rect: { left: 0, top: 0, right: Math.round(dw), bottom: Math.round(dh) },
                fillMode: TRTCVideoFillMode.TRTCVideoFillMode_Fill,
                zOrder: 0,
              }];
              return;
            }
          }
          return originalCenterLiveOwner.call(this);
        };
        proto.__nikoPatched = true;
        centerLiveOwnerPatched = true;
        console.log('[Niko] NoneStreamLayoutManager.centerLiveOwner patched to fill area');
      }
    }
    // 2) 劫持 setStreamLayout（关键）：tuikit 的 StreamLayoutService 会按混流画布比例
    //    计算出留黑边的 rect + fillMode=Fit 传进来，SDK 此时是“手动 rect”模式，
    //    直接照用该 rect，导致预览上下/左右黑边。这里在原型上统一改成满框 + Fill。
    const mmmProto = Object.getPrototypeOf(mmm);
    if (mmmProto && !mmmProto.__nikoSetStreamLayoutPatched) {
      const originalSetStreamLayout = mmmProto.setStreamLayout;
      if (typeof originalSetStreamLayout === 'function') {
        mmmProto.setStreamLayout = function (layout: any) {
          const userList = layout?.userList;
          if (Array.isArray(userList)) {
            let width = currentLayoutArea?.width || 0;
            let height = currentLayoutArea?.height || 0;
            if (!width || !height) {
              const el = document.querySelector('.video-layout .local-mixer-content') as HTMLElement | null;
              width = el?.clientWidth || 0;
              height = el?.clientHeight || 0;
            }
            for (const item of userList) {
              if (!item || item.userId !== '') {
                continue;
              }
              item.fillMode = TRTCVideoFillMode.TRTCVideoFillMode_Fill;
              if (width > 0 && height > 0) {
                item.rect = { left: 0, top: 0, right: Math.round(width), bottom: Math.round(height) };
              }
            }
          }
          return originalSetStreamLayout.call(this, layout);
        };
        mmmProto.__nikoSetStreamLayoutPatched = true;
        console.log('[Niko] MediaMixingManager.prototype.setStreamLayout patched');
      }
    }
    // 3) 劫持 addMediaSource / updateMediaSource：把摄像头/屏幕源的 rect 从
    //    SDK 默认的“等比缩放留黑边”改为“铺满画布裁剪”，解决竖屏时下方黑屏。
    if (mmmProto && !mmmProto.__nikoFillSourceRectPatched) {
      const originalAddMediaSource = mmmProto.addMediaSource;
      const originalUpdateMediaSource = mmmProto.updateMediaSource;
      if (typeof originalAddMediaSource === 'function') {
        mmmProto.addMediaSource = function (source: any) {
          fillSourceRectIfNeeded(source);
          return originalAddMediaSource.call(this, source);
        };
      }
      if (typeof originalUpdateMediaSource === 'function') {
        mmmProto.updateMediaSource = function (source: any) {
          fillSourceRectIfNeeded(source);
          return originalUpdateMediaSource.call(this, source);
        };
      }
      mmmProto.__nikoFillSourceRectPatched = true;
      console.log('[Niko] MediaMixingManager.addMediaSource/updateMediaSource patched to fill canvas');
    }
    patchedMediaMixingManager = mmm;
    // patch 生效前可能已添加了摄像头源，这里统一重铺一次
    refillCameraSources();
  } catch (error) {
    console.warn('[Niko] patchMediaMixingManager failed:', error);
  }
};

/* ---------------- 连线对方主播（RoomEngine 远端视频渲染成 DOM） ---------------- */
function guestViewId(userId: string) {
  return `niko-guest-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** 远端视频绑定：RoomEngine（IPC 模式）必须走 setRemoteVideoView + startPlayRemoteVideo，
 *  直接调 trtcCloud.startRemoteView(userId, element) 不会渲染。 */
async function bindGuestVideo(userId: string) {
  await nextTick();
  try {
    await roomEngine.instance?.setRemoteVideoView({
      userId,
      streamType: TUIVideoStreamType.kCameraStream,
      view: [guestViewId(userId)],
    });
    await roomEngine.instance?.startPlayRemoteVideo({
      userId,
      streamType: TUIVideoStreamType.kCameraStream,
    });
    console.log('[Niko] remote video bound:', userId, guestViewId(userId));
  } catch (error) {
    console.warn('[Niko] bind remote video failed:', userId, error);
  }
}

function stopGuestVideo(userId: string) {
  roomEngine.instance?.stopPlayRemoteVideo({
    userId,
    streamType: TUIVideoStreamType.kCameraStream,
  }).catch((error: unknown) => {
    console.warn('[Niko] stopPlayRemoteVideo failed:', userId, error);
  });
}

function removeRemoteGuest(userId: string) {
  remoteGuestUsers.value = remoteGuestUsers.value.filter((u) => u.userId !== userId);
  guestVideoAvailable.delete(userId);
  if (userId in guestAudioMuted.value) {
    const next = { ...guestAudioMuted.value };
    delete next[userId];
    guestAudioMuted.value = next;
  }
}

/** RoomEngine 远端用户进房：{ roomId, userInfo } */
const onRemoteUserEnterRoom = ({ userInfo }: { roomId: string; userInfo?: { userId: string; userName?: string } }) => {
  const userId = userInfo?.userId;
  if (!userId || !isInLive.value) {
    return;
  }
  if (remoteGuestUsers.value.some((u) => u.userId === userId)) {
    return;
  }
  console.log('[Niko] remote user entered:', userId, userInfo?.userName);
  remoteGuestUsers.value = [...remoteGuestUsers.value, { userId, nickName: userInfo?.userName }];
};

/** RoomEngine 远端用户视频状态变更：{ userId, streamType, hasVideo, reason } */
const onUserVideoStateChanged = ({ userId, streamType, hasVideo }: { userId: string; streamType: number; hasVideo: boolean; reason: number }) => {
  if (!userId) {
    return;
  }
  // 只处理摄像头主路流（kCameraStream = 0）
  if (streamType !== TUIVideoStreamType.kCameraStream) {
    return;
  }
  if (!hasVideo) {
    guestVideoAvailable.delete(userId);
    stopGuestVideo(userId);
    removeRemoteGuest(userId);
    return;
  }
  console.log('[Niko] remote camera available:', userId);
  guestVideoAvailable.add(userId);
  if (!remoteGuestUsers.value.some((u) => u.userId === userId)) {
    remoteGuestUsers.value = [...remoteGuestUsers.value, { userId }];
  }
  bindGuestVideo(userId);
};

/** RoomEngine 远端用户离开房间：{ roomId, userInfo } */
const onRemoteUserLeaveRoom = ({ userInfo }: { roomId: string; userInfo?: { userId: string; userName?: string } }) => {
  const userId = userInfo?.userId;
  if (!userId) {
    return;
  }
  stopGuestVideo(userId);
  removeRemoteGuest(userId);
};

const clearRemoteGuests = () => {
  remoteGuestUsers.value.forEach((u) => {
    stopGuestVideo(u.userId);
  });
  remoteGuestUsers.value = [];
  guestVideoAvailable.clear();
  guestAudioMuted.value = {};
};

/**
 * RoomEngine 事件注册：onMounted 执行时 TUIRoomEngine 可能还未 ready，
 * roomEngine.instance 为 null（此时 `?.on()` 会静默跳过，导致远端进房/视频事件全部接收不到，
 * 表现就是「连线后看不到对方」）。这里等 ready 后再绑定，并在已 ready 时幂等绑定。
 */
let roomEngineEventsBound = false;
const bindRoomEngineEvents = () => {
  const engine = roomEngine.instance;
  if (!engine || roomEngineEventsBound) {
    return;
  }
  roomEngineEventsBound = true;
  engine.on(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
  engine.on(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
  engine.on(TUIRoomEvents.onUserVideoStateChanged, onUserVideoStateChanged);
  console.log('[Niko] room engine events bound');
};

const bindRoomEngineEventsWhenReady = () => {
  if (roomEngine.instance) {
    bindRoomEngineEvents();
    return;
  }
  TUIRoomEngine.once('ready', bindRoomEngineEvents);
};

// 嘉宾数量变化后主播区宽度改变，重新绑定预览元素并按新尺寸铺满摄像头
watch(
  () => remoteGuestUsers.value.length,
  () => {
    nextTick(() => schedulePreviewRegion());
  },
);

const displayAudienceCount = computed(() => (nikoAudienceCount.value > 0 ? nikoAudienceCount.value : audienceCount.value));
const onAudienceCountChange = (count: number) => {
  nikoAudienceCount.value = count;
  if (count > peakAudienceCount.value) {
    peakAudienceCount.value = count;
  }
};
const isTransitioningToLogin = () => isGoingToLoginPage.value;
// Dialog message follows the same priority as the Web LivePusherView
// (PK > CoHost > CoGuest > default). While in PK the host can only end the
// whole live (ending the battle alone is no longer offered), so the PK
// branch shows a dedicated PK exit confirmation. The end-live
// confirm dialog actions (assembled in `showEndLiveDialog`) follow the same
// priority — see the `actions` array there.
const endLiveDialogMessage = computed(() => {
  if (currentBattleInfo.value?.battleId) {
    return t('You are currently live streaming and in a PK battle. Are you sure you want to exit?');
  }
  if (coHostStatus.value === CoHostStatus.Connected) {
    return t('Currently connected, do you need to "exit connection" or "end live broadcast"');
  }
  if (coGuestConnected.value.length > 1) {
    return t('You are currently co-guesting with other streamers. Would you like to [End Live] ?');
  }
  return t('You are currently live streaming. Do you want to end it?');
});

/**
 * Delay (ms) before redirecting to login page after logout/kick-off.
 * The C++ native rendering (bindPreviewArea) bypasses the Chromium compositor
 * and needs time to fully shut down after unbinding. We must wait for it to
 * finish before navigating away, otherwise the stale render surface remains
 * visible on the login page.
 */
const NATIVE_RENDERING_SHUTDOWN_DELAY_MS = 500;
let loginRedirectTimer: ReturnType<typeof setTimeout> | null = null;
// Explicit re-entry guard for logout-triggered redirect scheduling.
let hasStartedLogoutRedirect = false;

const liveParamsEditForm = ref({
  liveName: '',
  coverUrl: undefined as string | undefined,
});
const liveParams = computed(() => ({
  liveId: props.liveId || `live_${loginUserInfo.value?.userId}`,
  liveName:
    liveParamsEditForm.value.liveName
    || props.liveName
    || loginUserInfo.value?.userName
    || loginUserInfo.value?.userId
    || '',
  coverUrl: liveParamsEditForm.value.coverUrl ?? currentLive.value?.coverUrl ?? '',
  seatMode: props.seatMode || TUISeatMode.kApplyToTake,
}));
const currentLiveSettingDialogId = ref('');
const pendingLiveSettingName = ref('');
const pendingLiveSettingCoverUrl = ref('');
const currentAppQuitDialogId = ref('');
const currentAppQuitNeedsEndLive = ref(false);
const isAppQuitHandling = ref(false);
const currentForceLogoutDialogId = ref('');
const currentLogoutDialogId = ref('');
const {
  startSystemAudioLoopbackSafely,
  stopSystemAudioLoopbackSafely,
} = useSystemAudioLoopback('TUILiveKitWin');

const enableMultiPlaybackQuality = async () => {
  try {
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'enableMultiPlaybackQuality',
      params: {
        enable: true,
      },
    }));
  } catch (error) {
    console.warn('[TUILiveKitWin] enableMultiPlaybackQuality failed', error);
  }
};

TUIRoomEngine.once('ready', async () => {
  await enableMultiPlaybackQuality();
});

const handleStartLive = () => {
  if (loading.value || isTransitioningToLogin()) {
    return;
  }
  if (!loginUserInfo.value?.userId) {
    showMessage({
      type: MessageToastType.Info,
      message: t('Please login first'),
    });
    return;
  }
  if (isNetworkOffline()) {
    showMessage({
      type: MessageToastType.Error,
      message: t('Network error, please check your connection and try again'),
    });
    return;
  }
  // 关播后 StreamMixer 会被卸载，重新开播前先恢复挂载（原生预览窗口重新绑定）
  mixerActive.value = true;
  // ★ 统一入口：检查摄像头 → 有直接弹 PreLiveDialog，无先弹 CameraSettingDialog
  ensureCameraBeforePreLive();
};

// ========== 强制清理旧 TRTC 房间 ==========
// 从观众房（LivePlayer）跳到开播页（TUILiveKitWin）时，trtcCloud 单例里还留着旧房间状态，
// 必须先等 exitRoom 完成再 enterRoom，否则 C++ 层会在两个房间之间混乱（连线状态残留、
// camera add 失败、enterRoom 偶发返回 -1 等）。
function ensureTrtcExitRoom(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const onExitRoom = (reason: number) => {
      if (done) return;
      done = true;
      trtcCloud.off('onExitRoom', onExitRoom);
      console.log('[Niko] ensureTrtcExitRoom ok, reason:', reason);
      resolve();
    };
    trtcCloud.on('onExitRoom', onExitRoom);
    try {
      trtcCloud.exitRoom();
    } catch (e) {
      console.warn('[Niko] exitRoom threw (ignored):', e);
    }
    // 兜底：500ms 无论如何 resolve（防止根本不在房间里时 onExitRoom 永不触发）
    setTimeout(() => {
      if (!done) {
        done = true;
        trtcCloud.off('onExitRoom', onExitRoom);
        console.log('[Niko] ensureTrtcExitRoom timeout (assuming no previous room)');
        resolve();
      }
    }, 500);
  });
}

// 预开播弹窗确认后：用原生 trtcCloud.enterRoom 进房（与 web-obs-live 一致）
// 不使用 TUIRoomEngine.startLive/enterRoom：
//   - startLive 内部 createRoom 触发付费直播套餐校验（100013）
//   - enterRoom(kLive) 报房间类型错误（100006），enterRoom(kConference) 报房间不存在（100004）
// 原生 TRTC SDK 的 enterRoom({role:'anchor'}) 会隐式创建房间，不触发上述校验
const enterTrtcRoom = (roomId: string): Promise<number> => new Promise((resolve, reject) => {
  const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  const userInfo = stored ? JSON.parse(stored) : {};
  // 注意：trtc-electron-sdk 的 TRTCParams 构造函数是位置参数
  // (sdkAppId, userId, userSig, roomId, strRoomId, role, ...)，不支持对象传参。
  // 传对象会导致 strRoomId 为空，报 -3318 RoomID is invalid
  const params = new TRTCParams(
    Number(userInfo.sdkAppId),
    String(userInfo.userId || ''),
    String(userInfo.userSig || ''),
    0,
    String(roomId),
    TRTCRoleType.TRTCRoleAnchor,
  );
  console.log('[Niko] enterTrtcRoom params:', JSON.stringify({
    sdkAppId: params.sdkAppId,
    userId: params.userId,
    strRoomId: params.strRoomId,
    role: params.role,
  }));
  const onEnterRoom = (result: number) => {
    trtcCloud.off('onEnterRoom', onEnterRoom);
    if (result > 0) {
      resolve(result);
    } else {
      reject(new Error(`enterRoom failed, code: ${result}`));
    }
  };
  trtcCloud.on('onEnterRoom', onEnterRoom);
  trtcCloud.enterRoom(params, TRTCAppScene.TRTCAppSceneLIVE);
});

const onPreLiveConfirm = async (result: PrepareLiveResult & { liveTitle: string; coverUrl: string }) => {
  loading.value = true;
  // 兜底：确保原生预览窗口已挂载（正常流程 handleStartLive / handleRestartLive 已置 true）
  mixerActive.value = true;
  // 对齐 H5 / web-obs-live：
  //   TRTC 房间号 = live_index_id（后端/云端按它识别这路推流，用错会「当前未开播」）
  //   IM 群组 ID = room_id
  const trtcRoomId = result.live_index_id != null ? String(result.live_index_id) : '';
  const imRoomId = String(result.room_id || result.live_index_id || '');
  pendingPreLiveId.value = trtcRoomId;
  console.log('[Niko] prepare live ids:', JSON.stringify({
    liveIndexId: trtcRoomId,
    imRoomId,
  }));
  if (!trtcRoomId) {
    loading.value = false;
    showMessage({ type: MessageToastType.Error, message: t('Failed to create live') });
    return;
  }
  liveParamsEditForm.value.liveName = result.liveTitle;
  liveParamsEditForm.value.coverUrl = result.coverUrl;
  try {
    await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'setCurrentLanguage',
      params: {
        language: mapToRoomEngineLanguage(language.value),
      },
    }));
    // 实测 TUIRoomEngine.createRoom 返回 100007（the bill information is not available,
    // please purchase roomkit first），kLive / kConference 均不可用，
    // 因此不再通过 TUIRoomEngine 建房，完全对齐 web-obs-live：
    // 原生 TRTC 以主播身份进房推流 + LiteChat 加入同 ID 的 IM 群（聊天室 / 在线观众）。
    // 关键：先确保旧房间（如从 LivePlayer 观众房跳过来）已完全退出，
    // 否则同一个 trtcCloud 单例会在两个房间之间状态混乱
    await ensureTrtcExitRoom();
    // 强制清理 MediaMixingManager：
    // 只清 kCamera 类型的源（Integrated Camera 独占物理设备，必须彻底 release）。
    // 屏幕共享 / 图片 / 视频文件等源不独占设备，保留不动。
    // Vue state 同步清 camera 源，确保 hasCameraInMixer() 正确 → ensureDefaultCamera() 重新 add
    // 时从 localStorage 恢复上次保存的 deviceId（YY/OBS 虚拟摄像头 / Integrated Camera）。
    try {
      const mmm = (roomEngine.instance as any)?.getTRTCCloud?.()?.getMediaMixingManager?.();
      const cameraSources = (mmm?.sourceList || []).filter(
        (s: any) => s.sourceType === TRTCMediaSourceType.kCamera,
      );
      if (cameraSources.length) {
        console.log('[Niko] force-cleaning', cameraSources.length, 'camera source(s)');
        for (const src of cameraSources) {
          try { await mmm.removeMediaSource(src); } catch (_) {}
        }
        console.log('[Niko] force-clean camera sources done');
      }
      // 同步清 Vue state 里的 kCamera 源（和 SDK 保持一致）
      const prevList = videoMixerState.mediaSourceList.value;
      const cameraIdx = prevList.findIndex(
        (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
      );
      if (cameraIdx >= 0) {
        const withoutCamera = [...prevList];
        withoutCamera.splice(cameraIdx, 1);
        videoMixerState.mediaSourceList.value = withoutCamera;
        console.log('[Niko] Vue state camera source removed, remaining:', withoutCamera.length);
      }
    } catch (e) {
      console.warn('[Niko] force-clean failed (ignored):', e);
    }
    // 关键：重置 cameraEnsurePromise，破除 race condition 锁。
    // 上面的 force-clean 可能刚好把某个正在进行的 autoAddDefaultCamera 结果清掉了，
    // 如果不重置，下面 ensureDefaultCamera() 会复用那个已经 resolve 的旧 promise，
    // 导致 hasCameraInMixer 误判 / 画面黑。
    cameraEnsurePromise = null;
    // 等 500ms 让 C++ 层真正 close camera device（物理设备释放比较慢）
    await new Promise((r) => setTimeout(r, 500));
    await enterTrtcRoom(trtcRoomId);
    // 进房成功后再赋值 roomId：LiveChatPanel 监听该值去登录 IM 并加群，
    // 提前赋值会让 IM 登录/加群与 TRTC 进房并发，容易互相干扰。
    // 注意这里必须用后端 room_id（不是 TRTC 的 live_index_id）
    nikoRoomId.value = imRoomId;
    // 关键：ensureDefaultCamera 之前必须先 bindPreviewArea + startPublish。
    // 否则 StreamLayoutService 找不到容器 → camera add 成功后 SDK rollback → 画面出来又消失。
    try {
      const cloud = roomEngine.instance?.getTRTCCloud?.();
      const mixingManager = (cloud || trtcCloud).getMediaMixingManager();
      if (mixingManager) {
        await mixingManager.startPublish();
        console.log('[Niko] mediaMixing startPublish ok');
      }
    } catch (publishErr: any) {
      console.warn('[Niko] mediaMixing startPublish early failed:', publishErr?.message || publishErr);
    }
    // 强制立即 applyPreviewRegion（不等 400ms timer），确保 bindPreviewArea 完成
    await nextTick();
    applyPreviewRegion();
    // 给 SDK 足够时间让 StreamLayoutService 找到容器
    await new Promise((r) => setTimeout(r, 800));
    // 开播前确保摄像头已加入混流，否则推出去的是黑屏
    await ensureDefaultCamera();
    // 再补一次 startPublish（enterRoom 后必须再调）
    try {
      const cloud = roomEngine.instance?.getTRTCCloud?.();
      const mixingManager = (cloud || trtcCloud).getMediaMixingManager();
      if (mixingManager) {
        await mixingManager.startPublish();
        console.log('[Niko] mediaMixing startPublish ok (after camera)');
      }
    } catch (publishErr: any) {
      console.warn('[Niko] mediaMixing startPublish failed:', publishErr?.message || publishErr);
    }
    // 显式加入 IM 聊天室：不能只依赖聊天面板的 roomId watch，
    // 这里确认「点击开播」后真的进了群（后续消息/礼物都从该群下发）
    try {
      await joinLiveChat(imRoomId);
      console.log('[Niko] IM chat joined:', imRoomId);
    } catch (chatErr: any) {
      console.warn('[Niko] joinLiveChat failed:', chatErr?.message || chatErr);
    }
    liveStopNoticePending = false;
    nikoIsLive.value = true;
    liveStartedAt.value = Date.now();
    startLiveDurationTimer();
    peakAudienceCount.value = 0;
    totalJoinCount.value = 0;
    settleStats.value = null;
    loading.value = false;
    await openLocalMicrophone();
    startSystemAudioLoopbackSafely();
  } catch (error: any) {
    loading.value = false;
    if (isNetworkTimeoutError(error)) {
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    showMessage({ type: MessageToastType.Error,
      message: error?.message || t('Failed to create live'),
    });
  }
};

const showEndLiveConfirmWindow = () => {
  if (loading.value || isTransitioningToLogin()) {
    return;
  }

  const dialogId = `end-live-${Date.now()}`;
  // Action ordering mirrors the Web LivePusherView dialog footer:
  //   [Cancel, End live, Exit connection?]
  // The third action ("Exit connection") only appears when the host is
  // co-hosting but NOT in PK. During PK no third action is offered: a host
  // in PK can only end the whole live, not exit the PK alone. This matches
  // the gating in `endLiveDialogMessage` above so the dialog content and the
  // visible actions stay consistent.
  const actions: Array<TUIButtonAction> = [
    { text: t('Cancel'), value: EndLiveActionValue.Cancel, type: TUIButtonActionType.Normal },
    { text: t('End live'), value: EndLiveActionValue.EndLive, type: TUIButtonActionType.Dangerous },
  ];
  if (!currentBattleInfo.value?.battleId && coHostStatus.value === CoHostStatus.Connected) {
    actions.push({ text: t('Exit connection'), value: EndLiveActionValue.ExitConnection, type: TUIButtonActionType.Dangerous });
  }

  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'end-live',
    dialogId,
    title: t('End live'),
    content: endLiveDialogMessage.value,
    actions,
  });
};

const showLiveSettingChildWindow = (form: { liveName: string; coverUrl?: string }) => {
  if (isTransitioningToLogin()) {
    return;
  }
  const dialogId = `live-setting-${Date.now()}`;
  currentLiveSettingDialogId.value = dialogId;
  pendingLiveSettingName.value = form?.liveName || '';
  pendingLiveSettingCoverUrl.value = form?.coverUrl || '';

  ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
    panelType: ChildPanelType.LiveTitleSetting,
    initialData: {
      dialogId,
      liveName: pendingLiveSettingName.value,
      coverUrl: pendingLiveSettingCoverUrl.value,
      maxLength: LIVE_NAME_MAX_UTF8_BYTES,
    },
  });
};

const showAppQuitConfirmWindow = () => {
  if (isTransitioningToLogin() || isAppQuitHandling.value || currentAppQuitDialogId.value) {
    return;
  }

  const shouldEndLiveBeforeQuit = isInLive.value;
  const dialogId = `app-quit-${Date.now()}`;
  currentAppQuitDialogId.value = dialogId;
  currentAppQuitNeedsEndLive.value = shouldEndLiveBeforeQuit;

  const actions: Array<TUIButtonAction> = shouldEndLiveBeforeQuit
    ? [
      { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
      { text: t('Minimize to tray'), value: 'minimize-to-tray', type: TUIButtonActionType.Normal },
      { text: t('End live and quit'), value: 'end-live-and-quit', type: TUIButtonActionType.Dangerous },
    ]
    : [
      { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
      { text: t('Minimize to tray'), value: 'minimize-to-tray', type: TUIButtonActionType.Normal },
      { text: t('Quit app'), value: 'quit-app', type: TUIButtonActionType.Dangerous },
    ];

  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'app-quit',
    dialogId,
    title: shouldEndLiveBeforeQuit ? t('End live and quit?') : t('Quit app?'),
    content: shouldEndLiveBeforeQuit
      ? t('You are currently live streaming. Minimize to tray to keep streaming, or end the live and quit the app.')
      : t('Minimize to the system tray, or quit the app directly.'),
    actions,
  });
};

const showForceLogoutConfirmWindow = (payload: ForceLogoutNoticePayload) => {
  if (currentForceLogoutDialogId.value) {
    return;
  }
  const dialogId = `force-logout-${Date.now()}`;
  currentForceLogoutDialogId.value = dialogId;
  const actions: Array<TUIButtonAction> = [
    { text: t('Sure'), value: 'ack-force-logout', type: TUIButtonActionType.Normal },
  ];
  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'force-logout',
    dialogId,
    title: payload.title,
    content: payload.content,
    actions,
  });
};

/**
 * Active logout confirm: shown when the host clicks "Logout" while still
 * live streaming. Reuses the independent confirm BrowserWindow (same as
 * end-live / app-quit) since the Win main window renders via native C++ and
 * cannot host an in-window TUIMessageBox reliably.
 */
const showLogoutConfirmWindow = () => {
  if (isTransitioningToLogin() || currentLogoutDialogId.value) {
    return;
  }
  const dialogId = `logout-${Date.now()}`;
  currentLogoutDialogId.value = dialogId;
  const actions: Array<TUIButtonAction> = [
    { text: t('Cancel'), value: 'cancel', type: TUIButtonActionType.Normal },
    { text: t('Logout'), value: 'logout-confirm', type: TUIButtonActionType.Dangerous },
  ];
  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'logout',
    dialogId,
    title: t('Logout'),
    content: t('You are currently live streaming. Logging out will automatically end the live stream. Are you sure you want to log out?'),
    actions,
  });
};

const onConfirmDialogAction = async (payload: ConfirmDialogActionPayload) => {
  if (!payload?.scene) {
    return;
  }

  if (payload.scene === 'logout') {
    const dialogId = payload.dialogId || currentLogoutDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });
    currentLogoutDialogId.value = '';
    // Only the explicit "Logout" action proceeds; closing / cancel is a no-op.
    if (payload.action === 'logout-confirm') {
      await performLogout();
    }
    return;
  }

  if (payload.scene === 'force-logout') {
    const dialogId = payload.dialogId || currentForceLogoutDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });
    currentForceLogoutDialogId.value = '';
    return;
  }

  if (payload.scene === 'end-live') {
    // 禁播 / 封禁 / 下播提示框：无论点「确定」还是直接关闭，都必须终止直播
    if (liveStopDialogId && payload.dialogId === liveStopDialogId) {
      liveStopDialogId = '';
      ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
        scene: payload.scene,
        dialogId: payload.dialogId,
      });
      if (!loading.value) {
        await handleEndLive({ showErrorToast: false });
      }
      return;
    }
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId: payload.dialogId,
    });
    // Route the contextual third button back to the appropriate SDK call.
    // Mirrors `LivePusherView.handleExitConnection` on the Web side. We
    // swallow exitHostConnection errors here (just log to console) because
    // there's no toast surface above this IPC handler — the user has already
    // dismissed the dialog and an error would otherwise be silently
    // re-thrown into the void. Ending the PK alone is no longer offered, so
    // there is no `EndBattle` action to route here.
    if (payload.action === EndLiveActionValue.ExitConnection) {
      if (coHostStatus.value === CoHostStatus.Connected) {
        try {
          await exitHostConnection();
        } catch (error) {
          console.error('[TUILiveKitWin] exitHostConnection from end-live dialog failed', error);
        }
      }
      return;
    }
    if (payload.action !== EndLiveActionValue.EndLive) {
      return;
    }
    if (!loading.value) {
      await handleEndLive();
    }
    // 「返回列表」确认的结束直播：结束后跳回主播列表页
    if (navigateToListAfterEnd) {
      navigateToListAfterEnd = false;
      router.replace({ name: 'anchor-list' });
    }
    return;
  }

  if (payload.scene === 'app-quit') {
    if (isAppQuitHandling.value) {
      // First handler is still processing; it will resolve quit/cancel.
      return;
    }
    if (payload.dialogId && currentAppQuitDialogId.value && payload.dialogId !== currentAppQuitDialogId.value) {
      return;
    }

    const dialogId = payload.dialogId || currentAppQuitDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });

    const shouldEndLiveBeforeQuit = currentAppQuitNeedsEndLive.value;
    const confirmAction = shouldEndLiveBeforeQuit ? 'end-live-and-quit' : 'quit-app';

    // 最小化到系统托盘：不退出，隐藏主窗口
    if (payload.action === 'minimize-to-tray') {
      currentAppQuitDialogId.value = '';
      currentAppQuitNeedsEndLive.value = false;
      window.ipcRenderer?.send('minimize-to-tray');
      window.ipcRenderer?.send('app-quit-cancel');
      return;
    }

    if (payload.action !== confirmAction) {
      currentAppQuitDialogId.value = '';
      currentAppQuitNeedsEndLive.value = false;
      window.ipcRenderer?.send('app-quit-cancel');
      return;
    }

    isAppQuitHandling.value = true;
    try {
      let canQuit = true;
      if (shouldEndLiveBeforeQuit) {
        const endLiveSuccess = loading.value
          ? !isInLive.value
          : await handleEndLive({ showErrorToast: false });
        canQuit = endLiveSuccess && !isInLive.value;
      }
      if (!canQuit) {
        showMessage({
          type: MessageToastType.Error,
          message: t('Failed to end live, please try again later'),
        });
        window.ipcRenderer?.send('app-quit-cancel');
      } else {
        // Release the camera/mic held by the native (isIPCMode) TRTC engine
        // BEFORE signalling quit. The main process hard-exits right after
        // receiving app-quit-confirmed, so without this the camera LED would
        // linger for a few seconds. See releaseMediaResourcesBeforeQuit.
        await releaseMediaResourcesBeforeQuit();
        window.ipcRenderer?.send('app-quit-confirmed');
      }
    } finally {
      currentAppQuitDialogId.value = '';
      currentAppQuitNeedsEndLive.value = false;
      isAppQuitHandling.value = false;
    }
  }
};

const onApplyLiveTitle = (payload: ApplyLiveTitlePayload, from?: WindowType) => {
  if (from !== 'child') {
    return;
  }
  if (!payload?.dialogId || payload.dialogId !== currentLiveSettingDialogId.value) {
    return;
  }
  if (payload.action === 'confirm') {
    handleLiveSettingConfirm({
      liveName: payload.liveName || pendingLiveSettingName.value,
      coverUrl: payload.coverUrl ?? pendingLiveSettingCoverUrl.value,
    });
  }
  currentLiveSettingDialogId.value = '';
  pendingLiveSettingName.value = '';
  pendingLiveSettingCoverUrl.value = '';
};

/** 秒数格式化为「xx分xx秒」（对齐 web-obs-live 结算层的展示方式） */
const formatLiveDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) {
    return '00:00';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** 本地观看人数估算：峰值在线与累计进房人次取大者（短停留观众只会体现在进房计数里） */
const localAudienceEstimate = () => Math.max(peakAudienceCount.value, totalJoinCount.value);

/** 后端 action 118 结算消息到达时覆盖本地估算值 */
const applySettleStats = (stats: LiveSettleStats) => {
  const raw = stats.raw || {};
  const durationSeconds = Math.floor((Date.now() - liveStartedAt.value) / 1000);
  settleStats.value = {
    kTicket: String(raw.kticket ?? raw.k_ticket ?? raw.ticket_count ?? '0'),
    liveDuration: stats.liveDuration || formatLiveDuration(durationSeconds),
    audienceCount: Number(stats.audienceCount) || localAudienceEstimate(),
    newFansCount: Number(stats.newFansCount) || 0,
  };
};

const handleEndLive = async (options: { showErrorToast?: boolean } = {}): Promise<boolean> => {
  const { showErrorToast = true } = options;
  try {
    if (isTransitioningToLogin()) {
      return false;
    }
    if (isNetworkOffline()) {
      if (showErrorToast) {
        showMessage({
          type: MessageToastType.Error,
          message: t('Network error, please check your connection and try again'),
        });
      }
      return false;
    }

    loading.value = true;
    try {
      // 先停止本地混流推流，否则房间解散后 SDK 会持续报错
      try {
        const mixingManager = roomEngine.instance?.getTRTCCloud().getMediaMixingManager();
        await mixingManager?.stopPublish();
      } catch (stopPublishErr: any) {
        console.warn('[Niko] mediaMixing stopPublish failed:', stopPublishErr?.message || stopPublishErr);
      }
      // 通知后端关播要在房间还存活时调用：后端需要解散/停止该房间，房间不存在会返回 500
      if (pendingPreLiveId.value) {
        const liveIndexId = Number(pendingPreLiveId.value);
        if (!Number.isNaN(liveIndexId)) {
          try {
            await nikoStopLive({ liveIndexId });
            console.log('[Niko] stopLive backend ok, liveIndexId:', liveIndexId);
          } catch (e: any) {
            console.warn('[Niko] stopLive backend call failed:', e?.message || e);
          }
        }
        pendingPreLiveId.value = '';
      }
      // 不走 TUIKit endLive()：它内部调 LiveListManager.stopLive() 需要 currentLive（room identifier），
      // 但我们故意用原生 trtcCloud.enterRoom 进房（避开付费套餐校验），currentLive 永远为 null → 必报 -1001。
      // 直接走原生 trtcCloud.exitRoom() 退房即可。
      try {
        trtcCloud.exitRoom();
        console.log('[Niko] trtcCloud.exitRoom ok');
      } catch (exitErr) {
        console.warn('[Niko] trtcCloud.exitRoom threw (ignored):', exitErr);
      }
    } catch (endErr: any) {
      console.warn('[Niko] handleEndLive inner error:', endErr?.message || endErr);
    }
    // 退出 IM 群并重置本地状态
    try {
      await leaveLiveChat();
    } catch (leaveErr: any) {
      console.warn('[Niko] leaveLiveChat failed:', leaveErr?.message || leaveErr);
    }
    nikoRoomId.value = '';
    nikoAudienceCount.value = 0;
    nikoIsLive.value = false;
    // 关播时清理连线对方的远端视图
    clearRemoteGuests();
    userCardVisible.value = false;
    // 关播时只关原生预览，**不销毁 StreamMixer**！
    // 销毁 StreamMixer 会触发 WinLocalMixer unmount → SDK clearMediaSource() → Vue state 被清空 →
    // 左侧 LiveScenePanel 的摄像头列表被清空（这就是浏览器项目没问题但 Electron IPC 模式有问题的原因：
    // 浏览器不用 WinLocalMixer 组件，camera 生命周期独立于 UI 挂载）。
    // 保留 mixerActive = true 让 camera source 留在 SDK + Vue state 里，左侧还能看到。
    // 下次进房时 force-clean 会清 SDK + Vue camera 源（释放物理设备），然后 ensureDefaultCamera
    // 从 localStorage 恢复 deviceId 重新 addMediaSource。
    try {
      const mixingManager = roomEngine.instance?.getTRTCCloud().getMediaMixingManager();
      mixingManager?.bindPreviewArea?.(0, null);
      console.log('[Niko] handleEndLive: bindPreviewArea(0, null) ok, mixer preserved');
    } catch (e) {
      console.warn('[Niko] bindPreviewArea cleanup failed:', e);
    }
    await nextTick();
    // 先展示本地统计的结算层；若后端已推送 action 118，则保留服务端数据
    const durationSeconds = liveStartedAt.value
      ? Math.floor((Date.now() - liveStartedAt.value) / 1000)
      : 0;
    if (!settleStats.value) {
      settleStats.value = {
        kTicket: '0',
        liveDuration: formatLiveDuration(durationSeconds),
        audienceCount: localAudienceEstimate(),
        newFansCount: 0,
      };
    }
    liveStartedAt.value = 0;
    stopLiveDurationTimer();
    liveDurationSeconds.value = 0;
    stopSystemAudioLoopbackSafely();
    return true;
  } catch (error: any) {
    console.error('End live error:', error);
    if (showErrorToast && isNetworkTimeoutError(error)) {
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
    }
    return false;
  } finally {
    loading.value = false;
  }
};

/**
 * 处理后端下发的系统事件（对齐 web-obs-live ChatRoom）：
 * - warning：action 53 operate_type=0，仅警告
 * - system：system_aide 普通系统提示
 * - forbidden：action 53 operate_type=1 / system_aide 封禁文案，需要终止直播
 * - ended：action 118 结算 / system_aide 断开直播，需要终止直播并展示结算
 * Win 主窗口使用原生渲染，无法可靠承载窗内 MessageBox，因此统一走独立确认窗口。
 */
const showLiveNotice = (event: LiveImSystemEvent) => {
  const reason = event?.reason || '';
  if (event.kind === 'warning' || !event.stop) {
    ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
      scene: 'end-live',
      dialogId: `live-warning-${Date.now()}`,
      title: event.kind === 'warning' ? '警告' : '系统提示',
      content: reason || '收到系统提示',
      actions: [{ text: '知道了', value: 'cancel', type: TUIButtonActionType.Normal }],
    });
    return;
  }

  // 禁播 / 封禁 / 下播：必须在确认后终止直播，只弹一次
  if (!isInLive.value || liveStopNoticePending) {
    return;
  }
  liveStopNoticePending = true;
  const dialogId = `live-stop-${Date.now()}`;
  liveStopDialogId = dialogId;
  ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
    scene: 'end-live',
    dialogId,
    title: event.kind === 'ended' ? '直播已结束' : '封禁提示',
    content: reason || '当前直播已被平台终止',
    actions: [{ text: '确定', value: EndLiveActionValue.EndLive, type: TUIButtonActionType.Dangerous }],
  });
};

/** Handles app quit request (e.g. Cmd+Q / close main window): always ask confirm before quit. */
const handleAppRequestQuit = () => {
  if (isTransitioningToLogin()) {
    return;
  }
  showAppQuitConfirmWindow();
};

/**
 * Called when logged-in user is kicked off or userSig expires.
 * StreamMixer is already active, so we must tear it down first
 * and wait for native rendering to fully shut down before redirecting.
 */
const onLoggedOut = async () => {
  if (hasStartedLogoutRedirect) {
    return;
  }
  hasStartedLogoutRedirect = true;
  isGoingToLoginPage.value = true;
  await nextTick();
  loginRedirectTimer = setTimeout(() => {
    redirectToLogin();
  }, NATIVE_RENDERING_SHUTDOWN_DELAY_MS);
};

/**
 * Called when login fails after all retries.
 * StreamMixer was never initialized, so redirect immediately.
 */
const onLoginFailed = () => {
  redirectToLogin();
};

// Setup useElectronLogin Hook
const {
  loginWithRetry,
  setupEventListeners,
  cleanupEventListeners,
  handleLogout: handleElectronLogout,
} = useElectronLogin({
  onBeforeLogout: releaseBeautyResourcesOnLogout,
  onLogout: onLoggedOut,
  onLoginFailed,
  onForceLogoutNotice: (payload) => {
    isGoingToLoginPage.value = true;
    showForceLogoutConfirmWindow(payload);
  },
  forceLogoutMode: 'immediate',
});

// Perform the actual logout. On failure fall back to the local logout
// redirect so the user is never stuck on the pusher view.
const performLogout = async () => {
  try {
    await handleElectronLogout();
  } catch (error) {
    onLoggedOut();
  }
};

// Handle logout with live status check
const handleLogout = async () => {
  if (isTransitioningToLogin()) {
    return;
  }
  // When still live streaming, ask the host to confirm first: logging out
  // will automatically end the ongoing live stream.
  if (isInLive.value) {
    showLogoutConfirmWindow();
    return;
  }
  await performLogout();
};

function redirectToLogin() {
  // 区分「业务接口 401」与「TUIKit 被踢/签名过期」两类跳转来源
  console.warn('[Niko] redirect to login page', {
    hasStartedLogoutRedirect,
    isInLive: isInLive.value,
    loginReady: loginReady.value,
  });
  hasStartedLogoutRedirect = true;
  if (currentForceLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'force-logout',
      dialogId: currentForceLogoutDialogId.value,
    });
    currentForceLogoutDialogId.value = '';
  }
  if (currentLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'logout',
      dialogId: currentLogoutDialogId.value,
    });
    currentLogoutDialogId.value = '';
  }
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  router.replace({ name: 'login' });
}

watch(
  () => [currentLive.value?.liveId, loginUserInfo.value?.userId],
  ([newLiveId, newUserId]) => {
    ipcBridge.sendToCover(IPCMessageType.SYNC_LIVE_INFO, {
      liveId: newLiveId || '',
      liveOwner: newUserId || '',
    });
  },
  { immediate: true }
);

// 摄像头源变化时自动保存配置（用户在 CameraSettingDialog 换设备也能存）
watch(
  () => videoMixerState.mediaSourceList.value?.filter(
    (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
  ).map((m: MediaSource) => String(m.sourceId)),
  () => {
    saveCurrentCameraFromMixer();
  },
);

// Whether the most recent battle teardown was a "normal" end, i.e. the SDK
// fired `BattleEvent.onBattleEnded` (countdown timed out, or the battle was
// stopped because the remaining members dropped to <= 1). This is the ONLY
// case in which the cover window should play the PK result animation.
//
// Why a dedicated flag: in a 3+ host PK, when THIS host actively quits, the
// state layer only fires `onUserExitBattle` + `reset()` and never fires
// `onBattleEnded` (see BattleState.ts). Both paths clear `currentBattleInfo`
// identically, so the cover cannot tell them apart from `battleId` alone. We
// latch this flag on `onBattleEnded` and ship it inside the snapshot so the
// cover animates only on a genuine end, matching the Mac / Web kits whose
// `BattleDecorate` likewise animate solely on `onBattleEnded`.
//
// The flag is reset on every `onBattleStarted` (next PK round). A stale `true`
// lingering between battles is harmless because the cover reads it only at the
// instant `battleId` transitions from non-empty to empty.
const battleEndedNormally = ref(false);
const handleBattleEndedForCover = () => {
  battleEndedNormally.value = true;
};
const handleBattleStartedForCover = () => {
  battleEndedNormally.value = false;
};

// Aggregate the slice of battle / seat / co-host state that the cover window
// needs to render the PK overlay (score bar, countdown, start animation,
// per-seat ranking badge). The cover owns no atomicx state, so the main
// window pushes a fully-derived snapshot whenever any input ref changes.
const battleStateSnapshot = computed<BattleStateSnapshot>(() => ({
  battleId: currentBattleInfo.value?.battleId || '',
  battleDuration: currentBattleInfo.value?.config?.duration || 0,
  startTime: currentBattleInfo.value?.startTime || 0,
  battleUsers: (battleUsers.value || []).map(user => ({
    userId: user.userId,
    userName: user.userName,
    avatarUrl: user.avatarUrl,
  })),
  // Map cannot be structured-cloned safely across IPC; serialize to plain entries.
  battleScore: Array.from(
    (battleScore.value || new Map<string, number>()).entries(),
  ) as Array<[string, number]>,
  layoutTemplate: currentLive.value?.layoutTemplate ?? 0,
  connectedSeatCount: (seatList.value || []).filter(seat => seat.userInfo).length,
  connectedHostCount: (coHostConnected.value || []).length,
  battleEndedNormally: battleEndedNormally.value,
}));

// IPC throttle: during an active PK, `battleScore` updates can fire once per
// second from the SDK, and any concurrent seat join / layout switch causes
// `battleStateSnapshot` to recompute again. Without throttling we'd push a
// fresh structured-clone payload to the cover process on every flush, which
// then fans out to multiple Vue reactivity patches (score bar transition,
// per-seat badge re-render, countdown re-render) inside the cover window.
//
// `throttle(..., { leading: true, trailing: true })` semantics:
//   - The first change after a quiet period is sent IMMEDIATELY so PK
//     start (battleId 0 -> id) and layout switches feel instant.
//   - Subsequent changes within the throttle window are coalesced; only
//     the latest snapshot is sent when the timer fires.
const BATTLE_STATE_SYNC_THROTTLE_MS = 200;
const sendBattleStateToCover = throttle((snapshot: BattleStateSnapshot) => {
  ipcBridge.sendToCover(IPCMessageType.SYNC_BATTLE_STATE, snapshot);
}, BATTLE_STATE_SYNC_THROTTLE_MS);

watch(
  battleStateSnapshot,
  (snapshot) => sendBattleStateToCover(snapshot),
  { immediate: true },
);

const onUserOnSeatInfoChanged = (userOnSeatInfos: Array<Record<string, any>>) => {
  console.log('[TUILiveKitWin] onUserOnSeatInfoChanged:', userOnSeatInfos);
  ipcBridge.sendToCover(IPCMessageType.UPDATE_USER_ON_SEAT, userOnSeatInfos);
};

const onStreamLayoutChanged = (streamLayout: Record<string, any>) => {
  console.log('[TUILiveKitWin] onStreamLayoutChanged:', streamLayout);
  window.ipcRenderer.send('stream-layout', streamLayout);
  // 布局管理器此时已创建，尝试打 centerLiveOwner 原型补丁（铺满本地画面）
  patchMediaMixingManager();
};

const onStreamLayoutAreaChanged = (layoutArea: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
  console.log('[TUILiveKitWin] onStreamLayoutAreaChanged:', layoutArea);
  currentLayoutArea = { width: layoutArea.width, height: layoutArea.height };
  // 此时混流管理器已就绪，确保 setStreamLayout 劫持已生效
  patchMediaMixingManager();
  window.ipcRenderer.send('stream-layout-area', layoutArea);
};

onBeforeMount(async () => {
  nativeId.value = await getWindowID();
});

const handleLiveEnded = (eventInfo: LiveListEventInfo) => {
  if (eventInfo.reason === LiveEndedReason.endedByHost) {
    return;
  }
  if (eventInfo.reason === LiveEndedReason.endedByServer) {
    showMessage({ type: MessageToastType.Warning,
      message: t('Stream closed due to content violation'),
      duration: 5000,
    });
    return;
  }
  // Fallback for unknown ending reasons
  showMessage({ type: MessageToastType.Warning,
    message: t('The live room has been closed'),
    duration: 5000,
  });
};

onMounted(async () => {
  // Subscribe to live ended event
  subscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);

  // Track genuine battle end vs. active-exit so the cover plays the result
  // animation only on a real `onBattleEnded` (see `battleEndedNormally`).
  subscribeBattleEvent(BattleEvent.onBattleStarted, handleBattleStartedForCover);
  subscribeBattleEvent(BattleEvent.onBattleEnded, handleBattleEndedForCover);

  // 后端结算消息（action 118）：覆盖本场统计数据并展示结算层
  unsubscribeSettle = onLiveImSettle(applySettleStats);
  // 下播 / 禁播 / 封禁 / 警告（对齐 web-obs-live）
  unsubscribeSystem = onLiveImSystem(showLiveNotice);
  // PK / 连麦邀请：被邀请方弹窗、开始/结束状态（对齐 web-obs-live action 106/108/110）
  unsubscribePkInvite = onLiveImPkInvite(handlePkInviteReceived);
  unsubscribePkStarted = onLiveImPkStarted(handlePkStartedEvent);
  unsubscribePkEnded = onLiveImPkEnded(handlePkEndedEvent);
  // 累计本场进房人次：结算页「观看人数」的本地估算源之一
  // （观众列表 15s 轮询是快照，短停留观众会漏；进房消息每人必达）
  unsubscribeJoinCount = onLiveImMessage((message) => {
    if (isInLive.value && message?.kind === 'join') {
      totalJoinCount.value += 1;
    }
  });
  // 连线对方主播：通过 RoomEngine 事件监听远端用户（RoomEngine 可能使用子云实例，
  // 直接监听 trtcCloud 共享单例可能收不到事件）
  bindRoomEngineEventsWhenReady();

  // Setup event listeners
  setupEventListeners();
  ipcBridge.on(IPCMessageType.CONFIRM_DIALOG_ACTION, onConfirmDialogAction);
  ipcBridge.on(IPCMessageType.APPLY_LIVE_TITLE, onApplyLiveTitle);
  if (window.ipcRenderer) {
    window.ipcRenderer.on('app-request-quit', handleAppRequestQuit);
  }

  // Read user info from localStorage
  const currentUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  if (!currentUserInfo) {
    router.replace({ name: 'login' });
    return;
  }

  try {
    const userInfo = JSON.parse(currentUserInfo);
    const { sdkAppId, userSig, userId } = userInfo;

    // 从主播列表进入直播间观看时可能已经登录了同一个 IM 账号（TUIKit 全局会话），
    // 再次 login 会触发 multipleAccount 互踢，这里直接复用现有会话
    if (loginUserInfo.value?.userId && String(loginUserInfo.value.userId) === String(userId)) {
      console.log('[TUILiveKitWin] IM session already established, reuse it');
    } else {
      // Use retry mechanism for login
      await loginWithRetry(
        { sdkAppId, userId, userSig },
        { suppressErrorModal: true },
      );
    }
    loginReady.value = true;
    // 登录后 TUIRoomEngine 已 ready：确保远端进房/视频事件已注册
    bindRoomEngineEventsWhenReady();

    // ========== 彻底重启 MediaMixingManager 单例 ==========
    // 根因：
    // 1) 关软件重开后 MediaMixingManager（C++ 层）可能从残留配置恢复 sourceList →
    //    videoMixerState（SDK 模块级 ref）init 时同步了残留 camera → hasCameraInMixer()
    //    返回 true → ensureDefaultCamera() 跳过 → SDK 不调 addMediaSource → 画面黑
    // 2) router 离开再回来，exitRoom 没清 SDK sourceList → 同上
    // 3) onMounted 执行时 roomEngine.instance 可能还是 null（SDK 未 ready）→ mmm=null →
    //    旧代码里 force-clear SDK sourceList 完全被跳过

    // ====== 诊断日志 ======
    const cloud = (roomEngine.instance as any)?.getTRTCCloud?.();
    const mmmNow = cloud?.getMediaMixingManager?.();
    console.log('[Niko onMounted] START', {
      roomEngineInstance: !!roomEngine.instance,
      trtcCloud: !!cloud,
      mediaMixingManager: !!mmmNow,
      vueStateSources: videoMixerState.mediaSourceList.value.length,
    });

    await nextTick();
    await new Promise((r) => setTimeout(r, 400)); // 等 WinLocalMixer 把 bindPreviewArea(container) 做好

    // ====== STEP 1: 无条件清 Vue state 的 kCamera（不管 SDK ready 没） ======
    try {
      const prevList = videoMixerState.mediaSourceList.value;
      const cameraSources = prevList.filter(
        (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
      );
      console.log('[Niko onMounted] Vue state before clear: total=', prevList.length, 'kCamera=', cameraSources.length);
      if (cameraSources.length > 0) {
        const withoutCamera = prevList.filter(
          (m: MediaSource) => m.sourceType !== TRTCMediaSourceType.kCamera,
        );
        videoMixerState.mediaSourceList.value = withoutCamera;
        console.log('[Niko onMounted] Vue state kCamera CLEARED');
      }
      // 重置锁（防止复用上次的旧 promise）
      cameraEnsurePromise = null;
    } catch (e) {
      console.warn('[Niko onMounted] Vue state clear failed:', e);
    }

    // ====== STEP 2: force-clear SDK sourceList（SDK ready 时才做） ======
    // ★ 和正常进房 onPreLiveConfirm (L1591-1616) 完全一致：
    // 只 removeMediaSource(kCamera)，**不停 MediaMixingServer**！
    // MediaMixingManager constructor 已 auto-start server，正常流程里 server 始终是 Started。
    // 调 stopMediaMixingServer 会让 server 变 Idle，而 startPublish 不会自动重启，
    // 导致 addMediaSource 时 C++ 层找不到渲染服务 → 黑屏。
    const forceClearSdkSourceList = async (mmmm: any) => {
      if (!mmmm?.sourceList?.length) {
        console.log('[Niko onMounted] SDK sourceList already empty');
        return;
      }
      const cameraSources = mmmm.sourceList.filter(
        (s: any) => s.sourceType === TRTCMediaSourceType.kCamera,
      );
      if (!cameraSources.length) {
        console.log('[Niko onMounted] SDK sourceList has no camera:', mmmm.sourceList.length, 'total');
        return;
      }
      console.log('[Niko onMounted] force-removing', cameraSources.length, 'camera source(s) from SDK');
      for (const src of cameraSources) {
        try { await mmmm.removeMediaSource(src); } catch (e) {
          console.warn('[Niko onMounted] removeMediaSource:', src?.name || src, e);
        }
      }
      console.log('[Niko onMounted] SDK camera sources CLEARED (server untouched)');
    };

    const scheduleCameraRestore = async () => {
      const cloud = (roomEngine.instance as any)?.getTRTCCloud?.();
      const mmm = cloud?.getMediaMixingManager?.();
      if (!mmm) {
        console.warn('[Niko onMounted] scheduleCameraRestore: mmm is null!');
        return;
      }

      // ===== 和正常进房 onPreLiveConfirm (L1591-1658) 完全一致的顺序 =====
      // 正常进房流程（关键步骤）：
      //   force-clean removeMediaSource (不停 server!)
      //   → enterTrtcRoom()
      //   → startPublish()
      //   → applyPreviewRegion() / bindPreviewArea()
      //   → await 800ms
      //   → ensureDefaultCamera()
      //   → startPublish() again
      // 我们没有 enterRoom（还没开播），但其余步骤必须一致。

      // 1) force-clear：只 removeMediaSource(kCamera)，server 保持 Started
      await forceClearSdkSourceList(mmm);
      cameraEnsurePromise = null;
      await new Promise((r) => setTimeout(r, 500)); // 等 C++ 层释放物理设备

      // 2) startPublish + bindPreviewArea（server 应该还是 Started，ensureMediaServerMode 跳过）
      try {
        await mmm.startPublish();
        console.log('[Niko onMounted] startPublish ok');
      } catch (e) {
        console.warn('[Niko onMounted] startPublish failed:', e);
      }
      applyPreviewRegion();
      await nextTick();
      await new Promise((r) => setTimeout(r, 800));
      console.log('[Niko onMounted] bindPreviewArea + 800ms wait done');

      // 3) ensureDefaultCamera → addMediaSource
      await ensureDefaultCamera();
      console.log('[Niko onMounted] ensureDefaultCamera done');

      // 4) 收尾：再 startPublish（和正常进房 after camera 一样）
      await new Promise((r) => setTimeout(r, 500));
      try {
        await mmm.setStreamLayout({ layoutMode: 'None' });
        await mmm.startPublish();
        console.log('[Niko onMounted] force setStreamLayout + startPublish done');
      } catch (e) {
        console.warn('[Niko onMounted] force refreshLayout failed:', e);
      }
      applyPreviewRegion();
    };

    // ====== STEP 3: 确保 MediaMixingManager 已 init ======
    // 关键修复：TUIRoomEngine.once('ready') 只触发一次（SDK 初始化时），
    // loginWithRetry 触发 SDK ready 后我们才注册自己的 once → 永远不会触发！
    // 正确做法：roomEngine.instance 已 ready → 直接 enableLocalVideoMixer()
    // 初始化 MediaMixingManager；roomEngine.instance 真为 null 才等 once。
    let mmm = (roomEngine.instance as any)?.getTRTCCloud?.()?.getMediaMixingManager?.();
    console.log('[Niko onMounted] before ensureMixer: roomEngine=', !!roomEngine.instance, 'mmm=', !!mmm);
    if (!mmm && roomEngine.instance) {
      console.log('[Niko onMounted] enabling MediaMixingManager via enableLocalVideoMixer()...');
      try {
        await (videoMixerState as any).enableLocalVideoMixer?.();
        mmm = (roomEngine.instance as any)?.getTRTCCloud?.()?.getMediaMixingManager?.();
        console.log('[Niko onMounted] enableLocalVideoMixer done, mmm=', !!mmm);
      } catch (e) {
        console.warn('[Niko onMounted] enableLocalVideoMixer failed:', e);
      }
    }

    if (mmm) {
      console.log('[Niko onMounted] mmm ready, running full camera restore');
      await scheduleCameraRestore();
    } else if (roomEngine.instance) {
      // roomEngine 有了但 mmm 还是 null（enable 失败），再试一次 ensureDefaultCamera
      // 因为 addMediaSource 内部也会调 enableLocalVideoMixer
      console.warn('[Niko onMounted] mmm still null after enableLocalVideoMixer, trying direct ensureDefaultCamera');
      try {
        await ensureDefaultCamera();
        console.log('[Niko onMounted] ensureDefaultCamera succeeded despite mmm being null');
        // ensureDefaultCamera 里的 addMediaSource 会触发 enable → 此时 mmm 应该有了
        const mmmRetry = (roomEngine.instance as any)?.getTRTCCloud?.()?.getMediaMixingManager?.();
        if (mmmRetry) {
          await new Promise((r) => setTimeout(r, 300));
          try {
            await mmmRetry.setStreamLayout({ layoutMode: 'None' });
            await mmmRetry.startPublish();
            console.log('[Niko onMounted] retry force refreshLayout done');
          } catch (e) { console.warn('[Niko onMounted] retry refreshLayout:', e); }
        }
      } catch (e) {
        console.warn('[Niko onMounted] ensureDefaultCamera also failed:', e);
      }
      applyPreviewRegion();
    } else {
      // roomEngine.instance 真的还没 ready（极罕见），等 once
      console.warn('[Niko onMounted] roomEngine.instance is null! Deferring to TUIRoomEngine ready');
      TUIRoomEngine.once('ready', async () => {
        console.log('[Niko onMounted] deferred: TUIRoomEngine ready fired');
        try {
          await (videoMixerState as any).enableLocalVideoMixer?.();
        } catch {}
        await scheduleCameraRestore();
      });
      applyPreviewRegion();
    }
  } catch (e) {
    redirectToLogin();
  }
});

// ==================== 摄像头持久化（保存用户上次选的摄像头/分辨率） ====================
const CAMERA_CONFIG_KEY = 'niko_live_camera_config';

interface PersistedCameraConfig {
  deviceId: string;
  deviceName?: string;
  width: number;
  height: number;
  mirrorType?: number;
}
function saveCameraConfig(cam: PersistedCameraConfig) {
  try { window.localStorage.setItem(CAMERA_CONFIG_KEY, JSON.stringify(cam)); } catch {}
}
function loadCameraConfig(): PersistedCameraConfig | null {
  try {
    const raw = window.localStorage.getItem(CAMERA_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearCameraConfig() {
  try { window.localStorage.removeItem(CAMERA_CONFIG_KEY); } catch {}
}

// 摄像头列表变化时，保存当前 camera 源的最新配置
function saveCurrentCameraFromMixer() {
  const cam = videoMixerState.mediaSourceList.value.find(
    (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
  );
  if (!cam) return;
  saveCameraConfig({
    deviceId: String(cam.sourceId),
    deviceName: cam.name,
    width: cam.width || 1280,
    height: cam.height || 720,
    mirrorType: (cam as any).mirrorType,
  });
}

// USB 摄像头冷启动较慢，addMediaSource 可能 5 秒超时，这里重试几次避免预览/推流无画面
const autoAddDefaultCamera = async (retryCount = 3) => {
  // 优先恢复用户上次保存的摄像头配置
  const saved = loadCameraConfig();
  if (saved) {
    try {
      if (cameraList.value.length === 0) await getCameraList();
      // 确认保存的 deviceId 在当前设备列表中存在（USB 插拔可能变化）
      const stillExists = cameraList.value.some((c) => String(c.deviceId) === String(saved.deviceId));
      if (stillExists) {
        const width = saved.width || 1280;
        const height = saved.height || 720;
        await videoMixerState.addMediaSource({
          sourceId: saved.deviceId,
          sourceType: TRTCMediaSourceType.kCamera,
          name: saved.deviceName || 'Camera',
          width,
          height,
          rect: { left: 0, top: 0, right: width, bottom: height },
          mirrorType: saved.mirrorType ?? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable,
        } as MediaSource);
        console.log('[Niko] restored saved camera:', saved.deviceName || saved.deviceId);
        saveCurrentCameraFromMixer();
        return;
      } else {
        console.warn('[Niko] saved camera device no longer exists, falling back to default');
        clearCameraConfig();
      }
    } catch (err) {
      console.warn('[Niko] restore saved camera failed, falling back to default:', err);
      clearCameraConfig();
    }
  }

  // 兜底：用 cameraList[0] （系统第一个摄像头）
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      if (cameraList.value.length === 0) {
        await getCameraList();
      }
      const firstCamera = cameraList.value[0];
      if (!firstCamera) {
        console.warn('[Niko] no camera device found');
        return;
      }
      // 避免重复添加
      const exists = videoMixerState.mediaSourceList.value.some(
        (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera
          && String(m.sourceId) === String(firstCamera.deviceId),
      );
      if (exists) return;
      const width = 1280;
      const height = 720;
      await videoMixerState.addMediaSource({
        sourceId: firstCamera.deviceId,
        sourceType: TRTCMediaSourceType.kCamera,
        name: firstCamera.deviceName,
        width,
        height,
        rect: { left: 0, top: 0, right: width, bottom: height },
        mirrorType: TRTCVideoMirrorType.TRTCVideoMirrorType_Enable,
      } as MediaSource);
      console.log('[Niko] default camera added:', firstCamera.deviceName);
      saveCurrentCameraFromMixer();
      return;
    } catch (err) {
      if (attempt < retryCount) {
        console.log(`[Niko] auto add default camera retry (${attempt}/${retryCount}):`, err);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.warn(`[Niko] auto add default camera failed after ${retryCount} attempts:`, err);
      }
    }
  }
};

// 同一时刻只允许一次摄像头加入流程：
// 启动预热与点击开播可能并发调用，重复 addMediaSource 会互相干扰
let cameraEnsurePromise: Promise<void> | null = null;
const hasCameraInMixer = () => videoMixerState.mediaSourceList.value.some(
  (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
);
const ensureDefaultCamera = (): Promise<void> => {
  if (hasCameraInMixer()) {
    return Promise.resolve();
  }
  if (!cameraEnsurePromise) {
    cameraEnsurePromise = autoAddDefaultCamera().finally(() => {
      cameraEnsurePromise = null;
    });
  }
  return cameraEnsurePromise;
};

// ★ 等待用户通过 CameraSettingDialog 添加摄像头后，自动弹 PreLiveDialog
// handleStartLive 在无摄像头时会设 pendingPreLiveAfterCameraAdd = true + 弹 CameraSettingDialog，
// 用户添加成功后 videoMixerState.mediaSourceList 会多出一个 kCamera 源 → 触发此 watch → 弹 PreLiveDialog
watch(
  () => videoMixerState.mediaSourceList.value.filter(
    (m: MediaSource) => m.sourceType === TRTCMediaSourceType.kCamera,
  ).length,
  (cameraCount) => {
    if (pendingPreLiveAfterCameraAdd.value && cameraCount > 0) {
      console.log('[Niko] camera added via dialog, auto-opening PreLiveDialog');
      pendingPreLiveAfterCameraAdd.value = false;
      showPreLiveDialog.value = true;
    }
  },
);

const handleLiveSettingConfirm = async (form: { liveName: string; coverUrl?: string }) => {
  const updatedForm = {
    liveName: form.liveName.trim(),
    coverUrl: (form.coverUrl || '').trim(),
  };
  if (isSvgCoverUrl(updatedForm.coverUrl)) {
    showMessage({ type: MessageToastType.Error,
      message: t('Unsupported image format'),
    });
    return;
  }
  if (!isInLive.value || !currentLive.value?.liveId) {
    liveParamsEditForm.value = updatedForm;
    return;
  }

  if (isNetworkOffline()) {
    showMessage({ type: MessageToastType.Error,
      message: t('Network error, please check your connection and try again'),
    });
    return;
  }

  try {
    loading.value = true;
    const liveListManager = roomEngine.instance?.getLiveListManager();
    if (!liveListManager) {
      throw new Error('live list manager is unavailable');
    }
    await liveListManager.setLiveInfo({
      roomId: currentLive.value.liveId,
      name: updatedForm.liveName,
      coverUrl: updatedForm.coverUrl,
    });
    if (currentLive.value) {
      currentLive.value.liveName = updatedForm.liveName;
      currentLive.value.coverUrl = updatedForm.coverUrl;
    }
    liveParamsEditForm.value = updatedForm;
  } catch (error: unknown) {
    if (isNetworkTimeoutError(error)) {
      showMessage({
        type: MessageToastType.Error,
        message: t('Network error, please check your connection and try again'),
      });
      return;
    }
    console.error('[handleLiveSettingConfirm] failed to save live settings', error, {
      liveId: currentLive.value?.liveId,
      liveName: updatedForm.liveName,
      hasCoverUrl: Boolean(updatedForm.coverUrl),
    });
    showMessage({ type: MessageToastType.Error,
      message: t('Save failed'),
    });
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  unsubscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);
  unsubscribeBattleEvent(BattleEvent.onBattleStarted, handleBattleStartedForCover);
  unsubscribeBattleEvent(BattleEvent.onBattleEnded, handleBattleEndedForCover);
  if (loginRedirectTimer) {
    clearTimeout(loginRedirectTimer);
    loginRedirectTimer = null;
  }
  stopLiveDurationTimer();
  if (pkTimer) {
    clearInterval(pkTimer);
    pkTimer = null;
  }
  unsubscribeSettle?.();
  unsubscribeSettle = null;
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  unsubscribeJoinCount?.();
  unsubscribeJoinCount = null;
  unsubscribePkInvite?.();
  unsubscribePkInvite = null;
  unsubscribePkStarted?.();
  unsubscribePkStarted = null;
  unsubscribePkEnded?.();
  unsubscribePkEnded = null;
  clearIncomingPkInvite();
  roomEngine.instance?.off(TUIRoomEvents.onRemoteUserEnterRoom, onRemoteUserEnterRoom);
  roomEngine.instance?.off(TUIRoomEvents.onRemoteUserLeaveRoom, onRemoteUserLeaveRoom);
  roomEngine.instance?.off(TUIRoomEvents.onUserVideoStateChanged, onUserVideoStateChanged);
  roomEngineEventsBound = false;
  clearRemoteGuests();
  hasStartedLogoutRedirect = false;
  stopSystemAudioLoopbackSafely();
  if (currentForceLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'force-logout',
      dialogId: currentForceLogoutDialogId.value,
    });
    currentForceLogoutDialogId.value = '';
  }
  if (currentLogoutDialogId.value) {
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: 'logout',
      dialogId: currentLogoutDialogId.value,
    });
    currentLogoutDialogId.value = '';
  }
  // Drop any pending throttled SYNC_BATTLE_STATE push so we don't fire
  // after the main window has already torn down its IPC bridge.
  sendBattleStateToCover.cancel();
  cleanupEventListeners();
  ipcBridge.off(IPCMessageType.CONFIRM_DIALOG_ACTION, onConfirmDialogAction);
  ipcBridge.off(IPCMessageType.APPLY_LIVE_TITLE, onApplyLiveTitle);
  if (window.ipcRenderer) {
    window.ipcRenderer.off('app-request-quit', handleAppRequestQuit);
  }
  // onBeforeUnmount：只做最必要的清理。
  // 历史上这里手动 removeMediaSource 会触发 SDK onMediaSourceRemoved 事件 → Vue state mediaSourceList 自动清空
  // → 下次 TUILiveKitWin mount 时左侧空了。现在改为：
  //   - exitRoom：确保退出 TRTC 房间
  //   - bindPreviewArea(0, null)：关掉原生预览（防止残留画面）
  //   - cameraEnsurePromise = null：重置锁（防止新组件 mount 时复用旧 promise）
  //   - 不清 SDK sourceList、不清 Vue state mediaSourceList：交给 force-clean（onPreLiveConfirm 里）
  //     在下次进房前统一处理——释放物理设备 + 清 Vue state + ensureDefaultCamera 重新 add
  try {
    const mmm = (roomEngine.instance as any)?.getTRTCCloud?.()?.getMediaMixingManager?.();
    if (mmm?.bindPreviewArea) {
      try { mmm.bindPreviewArea(0, null); } catch (_) {}
    }
  } catch (e) {
    console.warn('[Niko onBeforeUnmount] mix cleanup failed:', e);
  }
  cameraEnsurePromise = null;
  // 退出 TRTC 房间（同步）
  try {
    (roomEngine.instance as any)?.exitRoom?.();
  } catch (_) {}
});
</script>

<style lang="scss" scoped>
@import "../TUILiveKit/assets/mac.scss";

/* PK 血条：盖在视频区顶部（视频已是 DOM，可以正常叠加） */
.pk-overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 80%;
  .pk-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.68);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 6px 14px;
    backdrop-filter: blur(6px);
    .pk-side {
      flex: 0 0 auto;
      min-width: 46px;
      text-align: center;
      .pk-score {
        font-size: 17px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
    }
    .pk-left .pk-score {
      color: #5fb8ff;
      text-shadow: 0 0 8px rgba(95, 184, 255, 0.45);
    }
    .pk-right .pk-score {
      color: #ff8b6c;
      text-shadow: 0 0 8px rgba(255, 139, 108, 0.45);
    }
    .pk-progress {
      flex: 1;
      height: 16px;
      background: #ff6b6b;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
      .pk-progress-inner {
        height: 100%;
        background: linear-gradient(90deg, #3aa0ff, #6cc5ff);
        border-radius: 8px;
        transition: width 0.5s ease;
      }
      .pk-countdown {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      }
    }
  }
}
/* 主播 + 连线嘉宾统一视频布局 */
.video-layout {
  position: absolute;
  inset: 0;
  display: flex;
  background: #000;
  overflow: hidden;
}
.video-cell-host {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.guest-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}
/* 0 位嘉宾：主播满屏 */
.video-layout-host-only .guest-column {
  display: none;
}
/* 1 位嘉宾：左右等分 */
.video-layout-split {
  .video-cell-host { flex: 1; }
  .guest-column { flex: 1; }
}
/* 2 位及以上嘉宾：主播占 2/3，嘉宾在右侧 1/3 堆叠 */
.video-layout-side {
  .video-cell-host { flex: 2; }
  .guest-column { flex: 1; }
}
.video-cell-guest {
  flex: 1;
  position: relative;
  background: #000;
  overflow: hidden;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  & + .video-cell-guest {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
}
.host-guest-video {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}
.host-guest-name {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}
/* 连线嘉宾声音开关（关闭其他主播声音） */
.guest-audio-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.75);
  }

  &.is-muted {
    color: #ff5c5c;
  }
}
/* 混流预览（SDK 把画面渲染进 .local-mixer-content，内部是 .trtc-video + video/canvas）。
   IPC 模式下不能传 Rect 重新绑定预览，因此直接控制预览容器的位置和尺寸，并按截图比例：
   - 竖屏：宽 50%、整高、水平居中
   - 横屏：整宽、top 11%、高 74%
   内部 video/canvas 用 object-fit: cover 裁掉多余部分，避免黑边。 */
.video-layout.is-portrait :deep(.local-mixer-content) {
  position: absolute !important;
  left: 25% !important;
  top: 0 !important;
  width: 50% !important;
  height: 100% !important;
}
.video-layout.is-landscape :deep(.local-mixer-content) {
  position: absolute !important;
  left: 0 !important;
  top: 11% !important;
  width: 100% !important;
  height: 74% !important;
}
/* 有嘉宾（左右等分 / 右侧堆叠）时主播格子被压缩，预览直接铺满自己的格子，
   否则竖屏 50%、横屏 top 11% 的比例是按整屏算的，会缩成一小块并留黑边 */
.video-layout.video-layout-split :deep(.local-mixer-content),
.video-layout.video-layout-side :deep(.local-mixer-content) {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
.video-layout :deep(.local-mixer-content .trtc-video) {
  width: 100% !important;
  height: 100% !important;
}
.video-layout :deep(.local-mixer-content .trtc-video video),
.video-layout :deep(.local-mixer-content .trtc-video canvas) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
/* 连麦 / PK 工具按钮：与音乐按钮一致（图标在上、文字在下） */
.niko-tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  height: 56px;
  padding: 0 6px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: $text-color1;
  cursor: pointer;
  transition: box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;

  .niko-tool-icon {
    width: 24px;
    height: 24px;
    color: inherit;
  }

  .niko-tool-label {
    @include text-size-12;
    line-height: 1;
    color: inherit;
    white-space: nowrap;
  }

  &:hover:not(:disabled) {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);

    .niko-tool-icon,
    .niko-tool-label {
      color: $icon-hover-color;
    }
  }

  &.is-pk-active {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.24), rgba(255, 165, 61, 0.24));
    box-shadow: 0 0 12px rgba(255, 107, 107, 0.35);

    .niko-tool-icon,
    .niko-tool-label {
      color: #ffb0a0;
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.niko-tool-btn-danger {
  color: #ff6b6b;

  &:hover:not(:disabled) {
    background: rgba(255, 107, 107, 0.18);
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.25);

    .niko-tool-icon,
    .niko-tool-label {
      color: #ff8a8a;
    }
  }
}

/* 收到连线邀请弹窗 */
.niko-pk-incoming-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.niko-pk-incoming {
  width: 360px;
  padding: 32px 24px 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, #23263a 0%, #16182a 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  color: #fff;
  text-align: center;
}

.niko-pk-incoming-avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7d5cff, #4a7bff);
  font-size: 28px;
  font-weight: 700;
}

.niko-pk-incoming-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.niko-pk-incoming-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.niko-pk-incoming-tip {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.niko-pk-incoming-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.niko-pk-incoming-btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.niko-pk-incoming-btn:hover {
  opacity: 0.85;
}

.niko-pk-incoming-btn.is-reject {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.niko-pk-incoming-btn.is-accept {
  background: linear-gradient(135deg, #7d5cff, #4a7bff);
  color: #fff;
}

/* 关播结算层：对齐 web-obs-live LiveBroadcastScreen 的 end-stats-mask 样式 */
.niko-settle-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(4px);
  animation: niko-settle-fade-in 0.3s ease-out;
}

.niko-settle-card {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px;
  color: #fff;
  text-align: center;
  animation: niko-settle-slide-up 0.4s ease-out;
}

.niko-settle-header {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #ff4d6a, #ff6b8a);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.niko-settle-hero {
  text-align: center;
  margin-bottom: 30px;

  .niko-settle-hero-value {
    font-size: 60px;
    font-weight: bold;
    line-height: 1.1;
    color: #ff4d6a;
    margin-bottom: 5px;
    font-variant-numeric: tabular-nums;
  }

  .niko-settle-hero-label {
    font-size: 16px;
    opacity: 0.8;
  }
}

.niko-settle-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
  margin-bottom: 30px;
}

.niko-settle-item {
  flex: 1;
  min-width: 0;
  padding: 15px 10px;

  .niko-settle-item-value {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 5px;
    font-variant-numeric: tabular-nums;
  }

  .niko-settle-item-label {
    font-size: 14px;
    opacity: 0.7;
  }
}

.niko-settle-footer {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 10px;
}

.niko-settle-btn {
  min-width: 180px;
  height: 40px;
  font-size: 16px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  color: #fff;
  transition: all 0.3s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }
}

.niko-settle-btn--primary {
  background: linear-gradient(90deg, #ff4d6a, #ff6b8a);
}

.niko-settle-btn--ghost {
  min-width: 120px;
  /* 与发送/开播按钮统一主题蓝 */
  background: var(--uikit-color-primary, #2b7fff);
}

@keyframes niko-settle-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes niko-settle-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tui-livekit-win {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 自己开播页统一黑色系 */
  --live-shell-bg: #050506;
  background-color: var(--live-shell-bg);

  .login-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    .login-loading-text {
      font-size: 1rem;
      color: #fff;
      opacity: 0.8;
    }
  }
  --live-panel-bg: #101013;
  --live-panel-border: #232329;
  --live-stage-bg: #000000;
  --live-stage-border: rgba(255, 255, 255, 0.14);
  --live-stage-highlight: rgba(255, 255, 255, 0.1);
  --live-stage-shadow:
    0 14px 36px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  --live-empty-slot-bg: #0b0b0d;
  --live-placeholder-text: rgba(255, 255, 255, 0.7);

  // Scoped dark-theme contrast tuning for Electron main view.
  --bg-color-topbar: var(--live-shell-bg);
  --bg-color-operate: var(--live-panel-bg);
  --bg-color-bubble-reciprocal: rgba(255, 255, 255, 0.08);
  --stroke-color-primary: var(--live-panel-border);
  --uikit-color-gray-1: #0b0b0d;
  --uikit-color-gray-2: #141417;
  --uikit-color-gray-3: #1c1c20;
  --uikit-color-gray-4: #242429;

  &.is-logout-transitioning {
    pointer-events: none;
  }

  .live-pusher-main {
    width: 100%;
    height: calc(100% - 44px);
    display: flex;
    flex-direction: row;
    user-select: none;
    padding: 10px 12px 12px 12px;
    gap: 10px;
    background-color: var(--bg-color-topbar);
    @include scrollbar;

    .main-left {
      flex: 0 0 20%;
      width: 20%;
      max-width: 320px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: $text-color1;

      .main-left-top {
        flex: 1;
        padding: 14px;
        background-color: var(--bg-color-operate);
        min-height: 0;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        overflow: hidden;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);

        .main-left-top-title {
          display: flex;
          align-items: center;
          height: 36px;
          box-sizing: border-box;
          user-select: none;
          margin-bottom: 12px;

          .title-text {
            @include text-size-16;
            display: inline-flex;
            align-items: center;
            justify-content: start;
            font-weight: 600;
          }
        }

        .main-left-top-content {
          height: calc(100% - 48px);
        }
      }

      .main-left-bottom {
        display: flex;
        flex-direction: column;
        justify-content: center;
        background-color: var(--bg-color-operate);
        padding: 14px;
        flex-shrink: 0;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);

        .main-left-bottom-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .main-left-bottom-fold {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            color: $text-color2;
            @include text-size-12;

            &:hover {
              color: $text-color1;
            }

            .arrow-icon {
              transition: transform 0.2s ease;

              &.expanded {
                transform: rotate(0deg);
              }

              &.collapsed {
                transform: rotate(180deg);
              }
            }
          }
        }

        .main-left-bottom-title {
          @include text-size-16;
          font-weight: 600;
        }

        .main-left-bottom-tools {
          @include dividing-line('top');
          margin-top: 14px;
          padding-top: 14px;
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
      }
    }

    .main-center {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      margin: 0;
      background-color: var(--bg-color-operate);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);

      .main-center-top {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 54px;
        padding: 0 18px;
        box-sizing: border-box;
        color: $text-color1;

        .main-center-top-left {
          @include text-size-16;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;

          .live-title {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 600;
          }

          /* 开播时长：00时00分00秒（高亮显示） */
          .live-start-time {
            flex: none;
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 10px;
            background: rgba(255, 214, 0, 0.16);
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: #ffd54a;
            white-space: nowrap;
          }

          .pusher-rank-btn {
            flex: none;
            display: inline-flex;
            gap: 4px;
            align-items: center;
            height: 22px;
            padding: 0 8px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
            cursor: pointer;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 999px;
            transition: color 0.15s ease, border-color 0.15s ease, opacity 0.2s ease;

            &:hover:not(:disabled) {
              color: #fff;
              border-color: rgba(255, 255, 255, 0.7);
            }

            &:disabled {
              cursor: not-allowed;
              opacity: 0.45;
            }
          }
        }

        /* 更多直播：观众数左侧入口，点击在直播间内下拉展示开播中的主播 */
        .more-live-btn {
          flex: none;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border: none;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;

          svg {
            width: 13px;
            height: 13px;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.16);
            color: #fff;
          }
        }

        .main-center-top-right {
          @include text-size-12;
          flex-shrink: 0;
          margin-left: 12px;
          padding: 3px 10px;
          border-radius: 12px;
          background: rgba(43, 127, 255, 0.14);
          color: #8cc4ff;
        }

        &::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 18px;
          right: 18px;
          height: 1px;
          background-color: var(--stroke-color-primary);
        }
      }

      .main-center-center {
        position: relative;
        flex: 1;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        transition: flex-basis 0.2s;
      }
      .main-center-center.prelive-collapsed {
        flex: 0 0 0;
        width: 0;
        height: 0;
      }
      .prelive-placeholder {
        display: none;
      }

      .main-center-bottom {
        position: relative;
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: 0 16px;
        background-color: var(--bg-color-operate);

        &::before {
          content: "";
          position: absolute;
          top: 0;
          left: 16px;
          right: 16px;
          height: 1px;
          background-color: var(--stroke-color-primary);
        }

        .main-center-bottom-header {
          @include text-size-14;
        }

        .main-center-bottom-content {
          display: flex;
          justify-content: space-between;
          height: 72px;

          .main-center-bottom-left {
            flex: 1;
            height: 100%;
            display: flex;
            align-items: center;
            gap: 16px;

            .main-center-bottom-tools {
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
            }
          }

          .main-center-bottom-right {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }

    .main-right {
      height: 100%;
      width: 20%;
      flex: 0 0 20%;
      max-width: 320px;
      color: $text-color1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 200px;

      .main-right-top {
        background-color: var(--bg-color-operate);
        color: $text-color1;
        height: 36%;
        min-height: 160px;
        padding: 14px;
        user-select: text;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        overflow: hidden;

        .main-right-top-title {
          display: flex;
          align-items: center;
          color: $text-color1;
          height: 36px;
          box-sizing: border-box;
          user-select: none;

          .card-title {
            border-bottom: none;
          }

          .title-text {
            @include text-size-16;
            font-weight: 600;
          }

          .title-count {
            font-weight: 400;
            color: $text-color2;
          }
        }

        :deep(.viewers-panel) {
          --uikit-color-gray-3: rgba(255, 255, 255, 0.06);
          --uikit-color-gray-4: rgba(255, 255, 255, 0.12);

          .viewer-item:hover {
            background: var(--uikit-color-gray-3);
          }

          .action-menu-item {
            background: var(--uikit-color-gray-3);

            &:hover {
              background: var(--uikit-color-gray-4);
            }
          }
        }
      }

      .main-right-bottom {
        flex: 1;
        min-height: 0;
        background-color: var(--bg-color-operate);
        color: $text-color1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 0;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);

        .main-right-bottom-header {
          display: flex;
          flex-direction: column;
          padding: 14px 14px 0;
        }

        .message-list-container {
          flex: 1 1 auto;
          min-height: 0;
          user-select: text;
        }
      }
    }
  }

  .loading-icon {
    animation: rotate 1s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .card-title {
    @include text-size-16;
    @include dividing-line;
  }
}
</style>

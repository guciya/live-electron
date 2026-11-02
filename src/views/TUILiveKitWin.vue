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
        hide-system-status
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
            </div>
          </div>
        </div>
        <div class="main-center">
          <div class="main-center-top">
            <div class="main-center-top-left">
              <!-- 电量 + WiFi 状态组（主播名字上方，鼠标悬停展示详情） -->
              <div class="main-center-status-row">
                <div
                  v-if="winBatteryInfo.hasBattery"
                  class="main-center-status-wrap main-center-battery"
                  :data-tip="winBatteryTooltip"
                >
                  <svg width="18" height="11" viewBox="0 0 20 12" aria-hidden="true">
                    <rect x="0.5" y="1" width="16" height="10" rx="2" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1" />
                    <rect x="16.5" y="3.5" width="2" height="5" rx="0.6" fill="rgba(255,255,255,0.45)" />
                    <rect v-if="winBatteryFill > 0" x="2" y="2.5" :width="winBatteryFill" height="7" rx="0.8" :fill="winBatteryColor" />
                    <polygon v-if="winBatteryInfo.charging" points="9,3.5 7,6.8 8.5,6.8 7.8,9.5 12.5,5.8 10.8,5.8 11.5,3.5" fill="#fff" opacity="0.85" />
                  </svg>
                </div>
                <div
                  class="main-center-status-wrap main-center-wifi"
                  :data-tip="winNetworkTooltip"
                >
                  <svg width="15" height="11" viewBox="0 0 16 12" aria-hidden="true">
                    <template v-if="winNetworkInfo.connected">
                      <path d="M 2.5 5.5 A 5.5 5.5 0 0 1 13.5 5.5"
                        :stroke="winWifiOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" stroke-width="1.3" fill="none" stroke-linecap="round" />
                      <path d="M 5 8.5 A 3 3 0 0 1 11 8.5"
                        :stroke="winWifiNearOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" stroke-width="1.3" fill="none" stroke-linecap="round" />
                      <circle cx="8" cy="10.8" r="1.1" :fill="winWifiNearOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" />
                    </template>
                    <template v-else>
                      <path d="M 2.5 5.5 A 5.5 5.5 0 0 1 13.5 5.5" stroke="rgba(255,255,255,0.25)" stroke-width="1.3" fill="none" stroke-linecap="round" />
                      <path d="M 5 8.5 A 3 3 0 0 1 11 8.5" stroke="rgba(255,255,255,0.25)" stroke-width="1.3" fill="none" stroke-linecap="round" />
                      <circle cx="8" cy="10.8" r="1.1" fill="#ef4444" />
                    </template>
                  </svg>
                </div>
              </div>
              <!-- main-center-status-text 已按产品要求移除（hover tooltip 直接显示在上方即可） -->
              <!-- 原来的直播标题/开播时长行 -->
              <div class="main-center-top-title-row">
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
              </div><!-- /main-center-top-title-row -->
            </div><!-- /main-center-top-left -->
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
          <div ref="centerRef" class="main-center-center" :class="{ 'prelive-collapsed': showPreLiveDialog }">
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
                  <span class="host-guest-name">{{ u.nickName || u.userId || '连线嘉宾' }}</span>
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
/** 是否挂载 StreamMixer（DOM 混流预览）。默认 false，等用户点击「开始直播」进入 onPreLiveConfirm 后才激活。
 * 打开开播页时只显示开播设置弹窗 + 黑色背景，不激活摄像头/混流，避免画面提前显示。 */
const mixerActive = ref(false);

const router = useRouter();
const { loginUserInfo, login: loginIm } = useLoginState();
const { t, language } = useUIKit();
const loading = ref(false);
const isToolsExpanded = ref(true);

// ============== 系统状态：电量 + 网络（放到主播名字上方展示） ==============
const winBatteryInfo = ref({ hasBattery: false, level: 100, charging: false });
const winNetworkInfo = ref({ connected: false, type: '', ssid: '', signal: 0 });
let winSystemStatusTimer: ReturnType<typeof setInterval> | null = null;

const winBatteryFill = computed(() => {
  const lv = Math.max(0, Math.min(100, winBatteryInfo.value.level));
  return Math.round((lv / 100) * 13 * 10) / 10;
});
const winBatteryColor = computed(() =>
  winBatteryInfo.value.level <= 20 ? '#ef4444' : '#22c55e'
);
const winWifiOn = computed(() => (winNetworkInfo.value.signal || 0) >= 50);
const winWifiNearOn = computed(() => (winNetworkInfo.value.signal || 0) >= 5);
const winBatteryTooltip = computed(() =>
  `电量 ${winBatteryInfo.value.level}%${winBatteryInfo.value.charging ? '（充电中）' : ''}`
);
const winNetworkTooltip = computed(() => {
  if (!winNetworkInfo.value.connected) return '网络未连接';
  if (winNetworkInfo.value.type === 'wifi') return `WiFi: ${winNetworkInfo.value.ssid || ''}（信号 ${winNetworkInfo.value.signal}%）`;
  return '以太网';
});

async function refreshWinSystemStatus() {
  try {
    if ((window as any).ipcRenderer?.invoke) {
      const [battery, network] = await Promise.all([
        (window as any).ipcRenderer.invoke('get-battery-info'),
        (window as any).ipcRenderer.invoke('get-network-info'),
      ]);
      if (battery) winBatteryInfo.value = battery;
      if (network) winNetworkInfo.value = network;
    }
  } catch {
    /* 忽略单次轮询失败 */
  }
}

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

/** 关闭结算面板：恢复开播前的画布调试状态（重新挂载原生预览并预热摄像头） */
const handleCloseSettle = () => {
  settleStats.value = null;
  mixerActive.value = true;
  void ensureDefaultCamera();
};

/** 关闭结算面板后回到预开播弹窗，实现「重新开播」 */
const handleRestartLive = () => {
  settleStats.value = null;
  // 结算层「重新开播」：先恢复原生预览窗口挂载，再预热摄像头
  mixerActive.value = true;
  void ensureDefaultCamera();
  showPreLiveDialog.value = true;
};

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
          let width = currentLayoutArea?.width || 0;
          let height = currentLayoutArea?.height || 0;
          if (!width || !height) {
            const el = document.querySelector('.video-layout .local-mixer-content') as HTMLElement | null;
            width = el?.clientWidth || 0;
            height = el?.clientHeight || 0;
          }
          // 画布尺寸还没就绪 — 跳过这次调用，等 DOM ready 后 SDK 会再次触发。
          // 避免 SDK 内部打 "view is null, no container HTML element" 的 warning。
          if (!width || !height) {
            return;
          }
          if (Array.isArray(userList)) {
            for (const item of userList) {
              if (!item || item.userId !== '') {
                continue;
              }
              item.fillMode = TRTCVideoFillMode.TRTCVideoFillMode_Fill;
              item.rect = { left: 0, top: 0, right: Math.round(width), bottom: Math.round(height) };
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
const onUserVideoStateChanged = ({ userId, streamType, hasVideo, userInfo }: { userId: string; streamType: number; hasVideo: boolean; reason: number; userInfo?: { userName?: string } }) => {
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
    remoteGuestUsers.value = [...remoteGuestUsers.value, {
      userId,
      nickName: userInfo?.userName || '',
    }];
  } else {
    // 已存在但没有名字 —— 补上
    remoteGuestUsers.value = remoteGuestUsers.value.map((u) =>
      u.userId === userId && !u.nickName && userInfo?.userName
        ? { ...u, nickName: userInfo.userName }
        : u,
    );
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
  // 摄像头预热改为在用户真正准备开播时触发：
  // 页面一进来就 addMediaSource 会产生 USB 摄像头 5s 超时、TIM 未就绪等大量报错，
  // 而用户可能根本不打算开播。放在这里既不误报，也能在填标题/封面期间完成预热。
  // 关播后 StreamMixer 会被卸载，重新开播前先恢复挂载（原生预览窗口重新绑定）
  mixerActive.value = true;
  void ensureDefaultCamera();
  showPreLiveDialog.value = true;
};

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

    // ⚠️ 关键：trtcCloud 是全局单例，TUIRoomEngine WASM 也会缓存上次进的房间。
    // AnchorList 进直播间 → LivePlayer enterRoom(room_X, audience) → 返回 → cleanupTrtc()
    // 是 fire-and-forget，WASM 内部还残留 room_X 的状态。
    // 如果直接 enterTrtcRoom(新房间)，会看到旧房间的用户画面（onRemoteUserEnterRoom 漏进来）。
    // 这里先 await exitRoom() 确保旧房间完全退出，再以 anchor 身份进新房间。
    await new Promise<void>((resolve) => {
      try {
        const exitRet = trtcCloud.exitRoom();
        if (exitRet && typeof (exitRet as any).then === 'function') {
          (exitRet as Promise<any>).then(() => resolve(), () => resolve());
        } else {
          // 没有 Promise 返回时，等 300ms 让 SDK C++ 层处理完
          setTimeout(resolve, 300);
        }
      } catch {
        resolve(); // 没进房过也会报错，忽略
      }
    });

    await enterTrtcRoom(trtcRoomId);
    // 进房成功后再赋值 roomId：LiveChatPanel 监听该值去登录 IM 并加群，
    // 提前赋值会让 IM 登录/加群与 TRTC 进房并发，容易互相干扰。
    // 注意这里必须用后端 room_id（不是 TRTC 的 live_index_id）
    nikoRoomId.value = imRoomId;
    // 进房后先清掉所有旧 media source —— 关播时 mixerActive=false 卸载清了一次，
    // 但 TRTC SDK 内部可能还残留旧设备状态，新的 StreamMixer 实例需要干净起点
    try {
      const allSources = [...videoMixerState.mediaSourceList.value];
      for (const s of allSources) {
        await videoMixerState.removeMediaSource(s);
      }
      console.log('[Niko] cleared old media sources, count:', allSources.length);
    } catch (clearErr: any) {
      console.warn('[Niko] clear old media sources failed:', clearErr?.message);
    }
    // 开播前确保摄像头已加入混流，否则推出去的是黑屏
    await ensureDefaultCamera();
    // 显式让 TRTC 启动本地视频：exitRoom 后 SDK 可能把摄像头设备 stop 了，
    // StreamMixer addMediaSource 只加进列表，设备本身可能还是 inactive
    try {
      if (cameraList.value.length === 0) await getCameraList();
      if (cameraList.value[0]) {
        await trtcCloud.startLocalVideo({
          videoDeviceId: cameraList.value[0].deviceId,
          videoType: TRTCVideoStreamType.TRTCVideoStreamTypeBig,
        });
        console.log('[Niko] startLocalVideo ok:', cameraList.value[0].deviceName);
      }
    } catch (vErr: any) {
      console.warn('[Niko] startLocalVideo failed:', vErr?.message || vErr);
    }
    // 开始推流：TUIKit 的推流由本地混流管理器负责，且仅在 currentLive 存在时自动触发。
    // 这里没有走 TUIKit startLive，需要手动 startPublish，否则手机端收不到画面。
    try {
      const cloud = roomEngine.instance?.getTRTCCloud?.();
      const mixingManager = (cloud || trtcCloud).getMediaMixingManager();
      if (mixingManager) {
        await mixingManager.startPublish();
        console.log('[Niko] mediaMixing startPublish ok');
      } else {
        console.warn('[Niko] getMediaMixingManager returned null, skip startPublish');
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
      await endLive();
    } catch (endErr: any) {
      // TUIKit endLive 依赖 currentLive 状态，原生进房无 currentLive，回退到原生退房
      console.warn('[Niko] endLive failed, fallback to exitRoom:', endErr?.message || endErr);
      try {
        trtcCloud.exitRoom();
      } catch (exitErr) {
        console.warn('[Niko] trtcCloud.exitRoom fallback failed:', exitErr);
      }
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
    // 关播后卸载 StreamMixer，停止混流预览与混流服务。
    // 卸载时 WinLocalMixer 会自动 clearMediaSource + bindPreviewArea(0,null) + stopMediaMixingServer。
    mixerActive.value = false;
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
  // trtcCloud 是全局单例。这里的 cleanup 只负责本地设备释放，
  // 不做 exitRoom（SSO channel 会被 tear down，WASM 模块 init 时 race）。
  // 真正的 exitRoom 兜底在 onPreLiveConfirm 里做（login 完成后、enterRoom 之前）。
  try {
    // stopLocalVideo 在 trtcCloud export 上不存在（它是 StreamMixer 的方法），
    // 只有 stopLocalPreview() 和 muteLocalVideo() 可用。用可选链安全调用。
    if (typeof (trtcCloud as any).stopLocalPreview === 'function') {
      (trtcCloud as any).stopLocalPreview();
    }
    if (typeof (trtcCloud as any).muteLocalVideo === 'function') {
      (trtcCloud as any).muteLocalVideo(true, TRTCVideoStreamType.TRTCVideoStreamTypeBig);
    }
    console.log('[Niko] mounted: muted local video + stopped preview (safe cleanup)');
  } catch (_) {
    console.warn('[Niko] TRTC mounted cleanup warning:', _);
  }
  // 系统状态：立即预取 + 30s 轮询（主播名字上方展示）
  void refreshWinSystemStatus();
  winSystemStatusTimer = setInterval(refreshWinSystemStatus, 30000);

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
  } catch (e) {
    redirectToLogin();
  }
});

// 自动添加默认摄像头到媒体混流（无需用户手动点击选择）
// USB 摄像头冷启动较慢，addMediaSource 可能 5 秒超时，这里重试几次避免预览/推流无画面
const autoAddDefaultCamera = async (retryCount = 3) => {
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
      return;
    } catch (err) {
      // USB 摄像头冷启动首次 addMediaSource 超时属于正常现象，重试通常即可成功，
      // 因此中间重试只在 log 中记录，最后一次失败才用 warn，避免未开播就刷一堆错误
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
  if (winSystemStatusTimer) {
    clearInterval(winSystemStatusTimer);
    winSystemStatusTimer = null;
  }
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
        align-items: stretch;
        width: 100%;
        min-height: 54px;
        padding: 8px 18px;
        box-sizing: border-box;
        color: $text-color1;

        .main-center-top-left {
          @include text-size-16;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          flex: 1;
          min-width: 0;

          /* 电量 + WiFi 状态行（主播名字上方） */
          .main-center-status-row {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            flex: none;
            -webkit-app-region: no-drag;
          }

          .main-center-status-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            cursor: default;

            /* CSS tooltip：hover 时显示 data-tip 内容 */
            &:hover::after {
              content: attr(data-tip);
              position: absolute;
              bottom: calc(100% + 8px);
              left: 50%;
              transform: translateX(-50%);
              padding: 4px 10px;
              border-radius: 5px;
              background: rgba(20, 22, 30, 0.95);
              color: #fff;
              font-size: 12px;
              font-weight: 400;
              white-space: nowrap;
              z-index: 999;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
              border: 1px solid rgba(255, 255, 255, 0.12);
              pointer-events: none;
            }

            &:hover::before {
              content: '';
              position: absolute;
              bottom: calc(100% + 3px);
              left: 50%;
              transform: translateX(-50%);
              border: 4px solid transparent;
              border-top-color: rgba(20, 22, 30, 0.95);
              z-index: 999;
              pointer-events: none;
            }
          }

          /* main-center-status-text 已按产品要求移除 */

          /* 名字 + 开播时长行 */
          .main-center-top-title-row {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 0;

            .live-title {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-weight: 600;
            }
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
          padding: 4px 10px;
          border-radius: 12px;
          background: rgba(43, 127, 255, 0.14);
          color: #8cc4ff;
          /* 父级 align-items: stretch，右侧按钮自身保持垂直水平居中 */
          align-self: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1.4;
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

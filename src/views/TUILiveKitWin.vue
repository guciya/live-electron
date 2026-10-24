<template>
  <UIKitProvider theme="dark">
    <div class="tui-livekit-win" :class="{ 'is-logout-transitioning': isGoingToLoginPage }">
      <div v-if="!loginReady" class="login-loading">
        <span class="login-loading-text">{{ t('Logging In') }}</span>
      </div>
      <template v-else>
      <LiveHeader @logout="handleLogout" :is-showing-in-child-window="true"/>
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
              <CoGuestButton :isShowingInChildWindow="true" />
              <CoHostButton :isShowingInChildWindow="true" />
              <TUIButton
                class="pk-button"
                :type="currentBattleInfo?.battleId ? 'danger' : 'primary'"
                :disabled="!isInLive || loading"
                @click="handlePkClick"
              >
                {{ currentBattleInfo?.battleId ? t('End PK') : t('PK') }}
              </TUIButton>
              <MusicButton :isShowingInChildWindow="true" />
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
            </div>
            <div class="main-center-top-right">
              {{ displayAudienceCount }} {{ t('People watching') }}
            </div>
          </div>
          <div class="main-center-center" :class="{ 'prelive-collapsed': showPreLiveDialog }">
            <div v-if="currentBattleInfo?.battleId" class="pk-overlay">
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
            <StreamMixer
              v-if="nativeId !== null && !isGoingToLoginPage"
              :windowId="nativeId"
              @on-user-on-seat-info-changed="onUserOnSeatInfoChanged"
              @on-stream-layout-changed="onStreamLayoutChanged"
              @on-stream-layout-area-changed="onStreamLayoutAreaChanged"
            />
          </div>
          <div class="main-center-bottom">
            <div class="main-center-bottom-content">
              <div class="main-center-bottom-left">
                <MicVolumeSetting />
                <SpeakerVolumeSetting />
                <div class="main-center-bottom-tools">
                  <OrientationSwitch />
                  <LayoutSwitch :isShowingInChildWindow="true"/>
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
            <LiveAudiencePanel height="calc(100% - 40px)" @count-change="onAudienceCountChange" />
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
              />
            </div>
          </div>
        </div>
        <LivePusherNotification />
        <PreLiveDialog
          v-model:visible="showPreLiveDialog"
          @confirm="onPreLiveConfirm"
        />
      </div>
      </template>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import trtcCloud from '../TUILiveKit/utils/trtcCloud';
import { TRTCVideoMirrorType, TRTCParams, TRTCAppScene, TRTCRoleType } from 'trtc-electron-sdk';
import { releaseMediaResourcesBeforeQuit } from '../TUILiveKit/utils/appQuitCleanup';
import TUIRoomEngine, { TUISeatMode, TUIRoomType, TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
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
import CoGuestButton from '../TUILiveKit/components/CoGuestButton.vue';
import CoHostButton from '../TUILiveKit/components/CoHostButton.vue';
import LivePusherNotification from '../TUILiveKit/components/LivePusherNotification.vue';
import LiveChatPanel from '../niko/components/LiveChatPanel.vue';
import LiveAudiencePanel from '../niko/components/LiveAudiencePanel.vue';
import { leaveLiveChat } from '../niko/im/liveIm';
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
import LayoutSwitch from '../TUILiveKit/components/LayoutSwitch.vue';
import MusicButton from '../TUILiveKit/components/MusicButton.vue';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { useSystemAudioLoopback } from '../TUILiveKit/hooks/useSystemAudioLoopback';
import useRoomEngine from '../TUILiveKit/utils/useRoomEngine';
import { mapToRoomEngineLanguage } from '../TUILiveKit/utils/common';
import { LIVE_NAME_MAX_UTF8_BYTES } from '../TUILiveKit/constants/tuiConstant';
import PreLiveDialog from '../niko/components/PreLiveDialog.vue';
import { stopLive as nikoStopLive } from '../niko/api/live';
import type { PrepareLiveResult } from '../niko/api/live';

console.log('TRTC SDK version:', trtcCloud.getSDKVersion());

const nativeId = ref<number | Uint8Array | null>(null);

const router = useRouter();
const { loginUserInfo } = useLoginState();
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
  if (currentBattleInfo.value?.battleId) {
    // 结束 PK
    try {
      await exitBattle({ battleId: currentBattleInfo.value.battleId });
    } catch (e) {
      console.warn('[Niko] exitBattle failed:', e);
    }
    return;
  }
  // 发起 PK：输入目标主播 userId
  const targetId = window.prompt(t('Enter target anchor userId for PK'));
  if (!targetId) return;
  try {
    await requestBattle({
      config: { duration: 300, needResponse: true, extensionInfo: '' },
      userIdList: [targetId],
      timeout: 30,
    });
    showMessage({ type: MessageToastType.Success, message: t('PK invitation sent') });
  } catch (e: any) {
    showMessage({ type: MessageToastType.Error, message: e?.message || t('Failed to start PK') });
  }
};
// 当前 SDKAppID 未开通直播房间套餐，使用 Conference 类型进房，手动维护直播状态
const nikoIsLive = ref(false);
const isInLive = computed(() => nikoIsLive.value || !!currentLive.value?.liveId);
const isGoingToLoginPage = ref(false);
// 登录完成前不渲染子组件，避免 TRTC 未初始化时拉直播列表/连麦候选报错
const loginReady = ref(false);
// 预开播弹窗（标题/封面/分类/方向）
const showPreLiveDialog = ref(false);
const pendingPreLiveId = ref<string>('');
// TRTC 房间号 / IM 群 ID（= 后端 room_id）
const nikoRoomId = ref<string>('');
// 在线人数来自 IM 群成员（TUIRoomEngine 房间不可用，TUIKit 的 audienceCount 恒为 0）
const nikoAudienceCount = ref(0);
const displayAudienceCount = computed(() => (nikoAudienceCount.value > 0 ? nikoAudienceCount.value : audienceCount.value));
const onAudienceCountChange = (count: number) => {
  nikoAudienceCount.value = count;
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
  // TRTC 房间号用后端返回的 room_id；live_index_id 仅用于后端关播接口
  const liveId = String(result.room_id || result.live_index_id);
  pendingPreLiveId.value = String(result.live_index_id);
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
    await enterTrtcRoom(liveId);
    // 进房成功后再赋值 roomId：LiveChatPanel 监听该值去登录 IM 并加群，
    // 提前赋值会让 IM 登录/加群与 TRTC 进房并发，容易互相干扰
    nikoRoomId.value = liveId;
    // 开播前确保摄像头已加入混流，否则推出去的是黑屏
    await ensureDefaultCamera();
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
    // 加入 IM 群由聊天面板在 roomId 变化时完成（对齐 web-obs-live 的 IM 监听）
    nikoIsLive.value = true;
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
};

const onStreamLayoutAreaChanged = (layoutArea: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
  console.log('[TUILiveKitWin] onStreamLayoutAreaChanged:', layoutArea);
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

    // Use retry mechanism for login
    await loginWithRetry(
      { sdkAppId, userId, userSig },
      { suppressErrorModal: true },
    );
    loginReady.value = true;
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
  unsubscribeEvent(LiveListEvent.onLiveEnded, handleLiveEnded);
  unsubscribeBattleEvent(BattleEvent.onBattleStarted, handleBattleStartedForCover);
  unsubscribeBattleEvent(BattleEvent.onBattleEnded, handleBattleEndedForCover);
  if (loginRedirectTimer) {
    clearTimeout(loginRedirectTimer);
    loginRedirectTimer = null;
  }
  if (pkTimer) {
    clearInterval(pkTimer);
    pkTimer = null;
  }
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

/* PK 进度条覆盖层 */
.pk-overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 80%;
  max-width: 500px;
  .pk-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    padding: 6px 12px;
    .pk-side {
      flex: 0 0 auto;
      min-width: 50px;
      text-align: center;
      .pk-score {
        color: #fff;
        font-size: 16px;
        font-weight: 700;
      }
    }
    .pk-progress {
      flex: 1;
      height: 14px;
      background: #2a3142;
      border-radius: 7px;
      position: relative;
      overflow: hidden;
      .pk-progress-inner {
        height: 100%;
        background: linear-gradient(90deg, #ff6b6b, #ffa500);
        border-radius: 7px;
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
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      }
    }
  }
}
.pk-button {
  min-width: 56px;
}

.tui-livekit-win {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  --live-shell-bg: #1c2638;

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
  --live-panel-bg: #232f44;
  --live-panel-border: #3a4f6d;
  --live-stage-bg: #0a1018;
  --live-stage-border: rgba(146, 190, 255, 0.36);
  --live-stage-highlight: rgba(171, 210, 255, 0.24);
  --live-stage-shadow:
    0 14px 36px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(125, 170, 240, 0.18);
  --live-empty-slot-bg: #0e1728;
  --live-placeholder-text: rgba(255, 255, 255, 0.74);

  // Scoped dark-theme contrast tuning for Electron main view.
  --bg-color-topbar: var(--live-shell-bg);
  --bg-color-operate: var(--live-panel-bg);
  --bg-color-bubble-reciprocal: rgba(255, 255, 255, 0.08);
  --stroke-color-primary: var(--live-panel-border);

  &.is-logout-transitioning {
    pointer-events: none;
  }

  .live-pusher-main {
    width: 100%;
    height: calc(100% - 44px);
    display: flex;
    flex-direction: row;
    user-select: none;
    padding: 0 12px 12px 12px;
    background-color: var(--bg-color-topbar);
    @include scrollbar;

    .main-left {
      flex: 0 0 20%;
      width: 20%;
      max-width: 320px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: $text-color1;

      .main-left-top {
        flex: 1;
        padding: 16px;
        background-color: var(--bg-color-operate);
        min-height: 0;

        .main-left-top-title {
          display: flex;
          align-items: center;
          height: 40px;
          box-sizing: border-box;
          user-select: none;
          margin-bottom: 16px;

          .title-text {
            @include text-size-16;
            display: inline-flex;
            align-items: center;
            justify-content: start;
          }
        }

        .main-left-top-content {
          height: calc(100% - 56px);
        }
      }

      .main-left-bottom {
        display: flex;
        flex-direction: column;
        justify-content: center;
        background-color: var(--bg-color-operate);
        padding: 16px;
        flex-shrink: 0;

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
        }

        .main-left-bottom-tools {
          @include dividing-line('top');
          margin-top: 16px;
          padding-top: 16px;
          display: flex;
          gap: 6px;
        }
      }
    }

    .main-center {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      margin: 0 6px;
      background-color: var(--bg-color-operate);

      .main-center-top {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 56px;
        padding: 0 16px;
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
          }
        }

        .main-center-top-right {
          @include text-size-12;
          flex-shrink: 0;
          margin-left: 12px;
        }

        &::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
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
      gap: 6px;
      min-width: 200px;

      .main-right-top {
        background-color: var(--bg-color-operate);
        color: $text-color1;
        height: 30%;
        padding: 16px;
        user-select: text;

        .main-right-top-title {
          display: flex;
          align-items: center;
          color: $text-color1;
          height: 40px;
          box-sizing: border-box;
          user-select: none;

          .title-text {
            @include text-size-16;
          }

          .title-count {
            font-weight: 400;
            color: $text-color2;
          }
        }

        :deep(.viewers-panel) {
          --uikit-color-gray-3: rgba(92, 122, 255, 0.1);
          --uikit-color-gray-4: rgba(92, 122, 255, 0.2);

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
        background-color: var(--bg-color-operate);
        color: $text-color1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 16px;

        .main-right-bottom-header {
          display: flex;
          flex-direction: column;
        }

        .message-list-container {
          flex: 1 1 auto;
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

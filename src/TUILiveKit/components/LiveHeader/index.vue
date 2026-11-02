<template>
  <header class="live-header tui-window-header">
    <div class="left">
      <div class="logo-badge">
        <img class="logo-icon" src="../../../assets/niko-logo.png" alt="Niko直播" />
        <span class="title">Niko直播</span>
      </div>
      <div class="statistics">
        <div class="statistics-container" v-for="(item, index) in statisticsInfoList" :key="item.text">
          <span class="statistics-text">{{ item.text }}</span>
          <span class="statistics-value">{{ item.value }}</span>
          <i class="statistics-space" v-if="index < statisticsInfoList.length - 1"></i>
        </div>
      </div>
      <!-- 系统状态：电池 + WiFi 纯 SVG 图标（去文字） -->
      <div v-if="!hideSystemStatus" class="live-header-status">
        <svg
          v-if="batteryInfo.hasBattery"
          class="live-status-svg"
          width="20" height="12" viewBox="0 0 20 12"
          :title="`电量 ${batteryInfo.level}%${batteryInfo.charging ? '（充电中）' : ''}`"
        >
          <rect x="0.5" y="1" width="16" height="10" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
          <rect x="16.5" y="3.5" width="2" height="5" rx="0.6" fill="rgba(255,255,255,0.4)" />
          <rect
            v-if="liveBatteryFill > 0"
            x="2" y="2.5"
            :width="liveBatteryFill"
            height="7" rx="0.8"
            :fill="liveBatteryColor"
          />
          <polygon
            v-if="batteryInfo.charging"
            points="9,3.5 7,6.8 8.5,6.8 7.8,9.5 12.5,5.8 10.8,5.8 11.5,3.5"
            fill="#fff" opacity="0.85"
          />
        </svg>
        <svg
          class="live-status-svg"
          width="16" height="12" viewBox="0 0 16 12"
          :title="liveNetworkTooltip"
        >
          <template v-if="networkInfo.connected">
            <path d="M 2.5 5.5 A 5.5 5.5 0 0 1 13.5 5.5"
              :stroke="liveWifiOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" stroke-width="1.3" fill="none" stroke-linecap="round" />
            <path d="M 5 8.5 A 3 3 0 0 1 11 8.5"
              :stroke="liveWifiNearOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" stroke-width="1.3" fill="none" stroke-linecap="round" />
            <circle cx="8" cy="10.8" r="1.1" :fill="liveWifiNearOn ? '#22c55e' : 'rgba(255,255,255,0.2)'" />
          </template>
          <template v-else>
            <path d="M 2.5 5.5 A 5.5 5.5 0 0 1 13.5 5.5" stroke="rgba(255,255,255,0.2)" stroke-width="1.3" fill="none" stroke-linecap="round" />
            <path d="M 5 8.5 A 3 3 0 0 1 11 8.5" stroke="rgba(255,255,255,0.2)" stroke-width="1.3" fill="none" stroke-linecap="round" />
            <circle cx="8" cy="10.8" r="1.1" fill="#ef4444" />
          </template>
        </svg>
      </div>
    </div>
    <div class="right">
      <button class="back-list-btn" type="button" @click="emit('backToList')">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>返回列表</span>
      </button>
      <!-- 关注列表 / 消息：仅开播页启用（放在「返回列表」右侧） -->
      <button
        v-if="showEntrances"
        class="back-list-btn header-entry-btn"
        type="button"
        @click="emit('openFollowList')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20s-7-4.35-7-9a4 4 0 017-2.65A4 4 0 0119 11c0 4.65-7 9-7 9z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>关注列表</span>
      </button>
      <button
        v-if="showEntrances"
        class="back-list-btn header-entry-btn"
        type="button"
        @click="emit('openMessage')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5.5h16v11H8.5L4 20V5.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>消息</span>
        <span v-if="messageUnread > 0" class="header-entry-badge">{{ messageUnread > 99 ? '99+' : messageUnread }}</span>
      </button>
      <div
        class="language-switch"
        v-click-outside="closeLanguageMenu"
      >
        <button
          class="language-button"
          type="button"
          :title="currentLanguageLabel"
          @click="toggleLanguageMenu"
        >
          <svg-icon class="language-icon" :icon="LanguageIcon" />
          <span class="language-short">{{ currentLanguageShort }}</span>
          <IconArrowStrokeSelectDown
            class="language-arrow"
            :class="[showLanguageMenu ? 'up-icon' : 'down-icon']"
          />
        </button>
        <div
          v-if="showLanguageMenu"
          class="language-menu"
          :class="{ 'language-menu--windows-constrained': isWindowsPlatform }"
        >
          <button
            v-for="option in languageOptions"
            :key="option.value"
            type="button"
            class="language-item"
            :class="{ active: option.value === language }"
            @click="selectLanguage(option.value)"
          >
            <span class="language-label">{{ option.label }}</span>
          </button>
        </div>
      </div>
      <div class="header-right">
        <div
          v-if="loginUserInfo"
          class="user-info-content"
          @click="handleUserControl"
          v-click-outside="handleHideUserControl"
        >
          <Avatar :src="loginUserInfo?.avatarUrl" :size="24" />
          <div class="header-right-name">
            {{ loginUserInfo?.userName || loginUserInfo?.userId }}
          </div>
          <button class="tui-live-icon">
            <IconArrowStrokeSelectDown
              :class="[showUserControl ? 'up-icon' : 'down-icon']"
            />
          </button>
        </div>
        <div v-if="showUserControl" class="user-control-container">
          <div class="user-control-item-foot" :title="'充值中心'" @click="openRecharge">
            <span class="user-control-label">充值中心</span>
          </div>
          <div class="user-control-item-foot" :title="t('User Profile')" @click="openProfile">
            <span class="user-control-label">{{ t('User Profile') }}</span>
          </div>
          <div class="user-control-item-foot" :title="t('Logout')" @click="handleLogOut">
            <span class="user-control-label">{{ t('Logout') }}</span>
          </div>
        </div>
      </div>
      <div class="window-tool">
        <button class="tui-live-icon" @click="onMinimize">
          <svg-icon :icon="MinimizeIcon"></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onToggleMaximize">
          <svg-icon v-if="!isMaximized" :icon="MaximizeIcon"></svg-icon>
          <svg-icon v-else :icon="MiniIcon"></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onClose">
          <svg-icon :icon="CloseIcon"></svg-icon>
        </button>
      </div>
    </div>
  </header>

  <!-- User Profile Dialog -->
  <UserProfileDialog
    v-model:visible="showProfileDialog"
    :userInfo="userProfileInfo"
    @save="onSaveProfileDialog"
    @close="onCancelProfileDialog"
  />

  <!-- Recharge Center Dialog -->
  <RechargeDialog v-model:visible="showRechargeDialog" />
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed, type Ref } from 'vue';
import { useUIKit, IconArrowStrokeSelectDown } from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../../base-component/MessageToast';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-electron';
import { TUILogin } from '@tencentcloud/tui-core-lite';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';
import { useLoginState, Avatar } from 'tuikit-atomicx-vue3-electron';
import type { TRTCStatistics } from 'trtc-electron-sdk';
import SvgIcon from '../../common/base/SvgIcon.vue';
import LogoIcon from '../../common/icons/LogoIcon.vue';
import MaximizeIcon from '../../common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../common/icons/MinimizeIcon.vue';
import MiniIcon from '../../common/icons/MiniIcon.vue';
import CloseIcon from '../../common/icons/CloseIcon.vue';
import LanguageIcon from '../../common/icons/LanguageIcon.vue';
import trtcCloud from '../../utils/trtcCloud';
import vClickOutside from '../../utils/vClickOutside';
import { isWindowPlatform } from '../../utils/platform';
import { mapToRoomEngineLanguage } from '../../utils/common';
import UserProfileDialog from './UserProfileDialog.vue';
import RechargeDialog from './RechargeDialog.vue';
import { ChildPanelType, ipcBridge, IPCMessageType, toPlainIpcPayload } from '../../ipc';
import logger from '../../utils/logger';

const logPrefix = '[LiveHeader]';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false,
  },
  // 开播页专用：在「返回列表」右侧展示关注列表 / 消息入口
  showEntrances: {
    type: Boolean,
    default: false,
  },
  // 开播页隐藏电量/WiFi 图标（主播列表页保留）
  hideSystemStatus: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  logout: [];
  backToList: [];
  openFollowList: [];
  openMessage: [];
}>();

const { t, language, setLanguage } = useUIKit();
const { loginUserInfo, setSelfInfo } = useLoginState();

// User control dropdown state
const showUserControl = ref(false);
const showLanguageMenu = ref(false);
const showProfileDialog = ref(false);
const showRechargeDialog = ref(false);
const isWindowsPlatform = isWindowPlatform();

// Construct userInfo for UserProfileDialog
const userProfileInfo = computed(() => ({
  userId: loginUserInfo.value?.userId || '',
  userName: loginUserInfo.value?.userName || '',
  avatarUrl: loginUserInfo.value?.avatarUrl || '',
}));

// Performance statistics
const isMaximized: Ref<boolean> = ref(false);
const statistics = ref<TRTCStatistics>({
  appCpu: 0,
  downLoss: 0,
  localStatisticsArray: [],
  localStatisticsArraySize: 0,
  receivedBytes: 0,
  remoteStatisticsArray: [],
  remoteStatisticsArraySize: 0,
  rtt: 0,
  sentBytes: 0,
  systemCpu: 0,
  upLoss: 0,
  appMemoryUsageInMB: 0,
} as unknown as TRTCStatistics);

const frameRate = computed(() => {
  return statistics.value.localStatisticsArray?.[0]?.frameRate || 0;
});

// ============== 系统状态：电池电量 + 网络（WiFi / 以太网） ==============
const batteryInfo = ref({ hasBattery: false, level: 100, charging: false });
const networkInfo = ref({ connected: false, type: '', ssid: '', signal: 0 });

const refreshSystemStatus = async () => {
  try {
    if (window.ipcRenderer?.invoke) {
      const [battery, network] = await Promise.all([
        window.ipcRenderer.invoke('get-battery-info'),
        window.ipcRenderer.invoke('get-network-info'),
      ]);
      if (battery) batteryInfo.value = battery;
      if (network) networkInfo.value = network;
    }
  } catch (e) {
    // 忽略单次轮询失败
  }
};

const batteryText = computed(() => {
  if (!batteryInfo.value.hasBattery) return '';
  const icon = batteryInfo.value.charging ? '⚡' : '';
  return `${icon}${batteryInfo.value.level}%`;
});

const networkText = computed(() => {
  if (!networkInfo.value.connected) return '网络未连接';
  if (networkInfo.value.type === 'wifi') {
    const name = networkInfo.value.ssid || 'WiFi';
    return `${name} ${networkInfo.value.signal}%`;
  }
  return '有线连接';
});

const statisticsInfoList = computed(() => {
  const list = [
    {
      text: t('CPU'),
      value: statistics.value.appCpu + '%',
    },
    {
      text: t('RAM'),
      value: statistics.value.appMemoryUsageInMB + 'MB',
    },
    {
      text: t('Frame Rate'),
      value: String(frameRate.value || 0),
    },
  ];
  // 电量/网络不再以文字显示，改为右侧纯 SVG 图标
  return list;
});

// ===== SVG 图标用计算属性 =====
const BATTERY_INNER_MAX = 13;
const liveBatteryFill = computed(() => {
  const lv = Math.max(0, Math.min(100, batteryInfo.value.level));
  return Math.round((lv / 100) * BATTERY_INNER_MAX * 10) / 10;
});
const liveBatteryColor = computed(() =>
  batteryInfo.value.level <= 20 ? '#ef4444' : '#22c55e'
);
const liveWifiOn = computed(() => (networkInfo.value.signal || 0) >= 50);
const liveWifiNearOn = computed(() => (networkInfo.value.signal || 0) >= 5);
const liveNetworkTooltip = computed(() => {
  if (!networkInfo.value.connected) return '网络未连接';
  if (networkInfo.value.type === 'wifi') return `WiFi: ${networkInfo.value.ssid || ''}（信号 ${networkInfo.value.signal}%）`;
  return '以太网';
});

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '日本語', value: 'ja-JP' },
  { label: 'English', value: 'en-US' },
  { label: '한국어', value: 'ko-KR' },
];

const currentLanguageLabel = computed(() => {
  return languageOptions.find(option => option.value === language.value)?.label || '';
});

const currentLanguageShort = computed(() => {
  switch (language.value) {
  case 'zh-CN':
    return '简';
  case 'zh-TW':
    return '繁';
  case 'ja-JP':
    return '日';
  case 'ko-KR':
    return '한';
  case 'en-US':
  default:
    return 'EN';
  }
});

// Handle statistics update from TRTCCloud
function onStatistics(statis: TRTCStatistics) {
  statistics.value = statis;
}

// Window control functions
const onMinimize = () => {
  console.log('[LiveHeader]onMinimize');
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-minimize-window', null);
  }
};

const onToggleMaximize = () => {
  console.log('[LiveHeader]onToggleMaximize');
  isMaximized.value = !isMaximized.value;
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-maximize-window', isMaximized.value);
  }
};

const onClose = () => {
  console.log('[LiveHeader]onClose');
  if (window.ipcRenderer) {
    window.ipcRenderer.send('on-close-window', null);
  }
};

/**
 * Handle user control dropdown toggle
 */
function handleUserControl() {
  showUserControl.value = !showUserControl.value;
  if (showUserControl.value) {
    showLanguageMenu.value = false;
  }
}

/**
 * Handle hide user control dropdown
 */
function handleHideUserControl() {
  showUserControl.value = false;
}

function toggleLanguageMenu() {
  showLanguageMenu.value = !showLanguageMenu.value;
  if (showLanguageMenu.value) {
    showUserControl.value = false;
  }
}

function closeLanguageMenu() {
  showLanguageMenu.value = false;
}

function selectLanguage(newLanguage: string) {
  if (language.value !== newLanguage) {
    setLanguage(newLanguage);
    TUIRoomEngine.callExperimentalAPI(JSON.stringify({
      api: 'setCurrentLanguage',
      params: {
        language: mapToRoomEngineLanguage(newLanguage),
      },
    }));
  }
  showLanguageMenu.value = false;
}

/**
 * Open recharge center dialog
 */
function openRecharge() {
  showUserControl.value = false;
  showRechargeDialog.value = true;
}

/**
 * Open user profile dialog
 */
function openProfile() {
  showUserControl.value = false;

  if (props.isShowingInChildWindow) {
    // If in child window, send IPC to main process to open profile dialog in a new child window
    ipcBridge.sendToChild(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.UserProfile,
      initialData: toPlainIpcPayload(userProfileInfo.value),
    });
  } else {
    // Otherwise, open profile dialog in current window
    showProfileDialog.value = true;
  }
}

/**
 * Handle profile dialog save event
 * Call setSelfInfo to persist changes and provide toast feedback
 */
async function onSaveProfileDialog(data: { userName: string; avatarUrl: string }) {
  try {
    logger.debug(`${logPrefix} Saving user profile`, data);
    await setSelfInfo({
      userName: data.userName,
      avatarUrl: data.avatarUrl,
    });

    showMessage({
      type: MessageToastType.Success,
      message: t('Save successfully'),
    });

    showProfileDialog.value = false;
  } catch (error) {
    logger.error(`${logPrefix} Save user profile error:`, error);
    showMessage({
      type: MessageToastType.Error,
      message: t('Save failed'),
    });
  }
}

/**
 * Handle profile dialog cancel event
 */
function onCancelProfileDialog() {
  showProfileDialog.value = false;
}

/**
 * Handle logout button click
 * Emit logout event to parent component
 */
function handleLogOut() {
  showUserControl.value = false;
  emit('logout');
}

/**
 * 未读私信红点：统计 C2C 会话未读数（直播间群消息不计入）。
 * 10s 轮询 + 打开消息中心后由父组件调用 refreshMessageUnread 立即刷新。
 */
const messageUnread = ref(0);
let unreadTimer: ReturnType<typeof setInterval> | null = null;
let systemStatusTimer: ReturnType<typeof setInterval> | null = null;

const refreshMessageUnread = async () => {
  try {
    const chat = (TUILogin as any).getContext?.()?.chat || (TUIChatEngine as any)?.chat;
    if (!chat?.getConversationList) {
      return;
    }
    const res = await chat.getConversationList();
    const list: any[] = res?.data?.conversationList || [];
    messageUnread.value = list
      .filter((conv) => String(conv.conversationID || '').startsWith('C2C'))
      .reduce((sum, conv) => sum + Number(conv.unreadCount || 0), 0);
  } catch (error) {
    // IM 尚未就绪 / 登录切换中，忽略
  }
};

onMounted(async () => {
  trtcCloud.on('onStatistics', onStatistics);
  ipcBridge.on(IPCMessageType.UPDATE_USER_PROFILE, onSaveProfileDialog);
  void refreshMessageUnread();
  unreadTimer = setInterval(refreshMessageUnread, 10000);
  // 电池电量 + WiFi：30s 轮询，首次立即拉取
  void refreshSystemStatus();
  systemStatusTimer = setInterval(refreshSystemStatus, 30000);
});

onBeforeUnmount(() => {
  trtcCloud.off('onStatistics', onStatistics);
  ipcBridge.off(IPCMessageType.UPDATE_USER_PROFILE, onSaveProfileDialog);
  if (unreadTimer) {
    clearInterval(unreadTimer);
    unreadTimer = null;
  }
  if (systemStatusTimer) {
    clearInterval(systemStatusTimer);
    systemStatusTimer = null;
  }
});

defineExpose({ refreshMessageUnread });

</script>

<style lang="scss" scoped>
@import "../../assets/variable.scss";
.header-entry-btn {
  position: relative;
}
.header-entry-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ff3b30;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  pointer-events: none;
}
.live-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 2.75rem;
  line-height: 2.75rem;
  padding: 0 1rem;
  font-size: $font-live-header-size;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background-color: var(--bg-color-topbar);
  cursor: move;

  /* 电池/WiFi 纯 SVG 图标（与 AnchorList 风格一致） */
  .live-header-status {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-left: 32px;
    -webkit-app-region: no-drag;
  }
  .live-status-svg {
    display: inline-block;
    flex-shrink: 0;
    cursor: default;
  }

  .left {
    margin-left: 8px;
    margin-top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 12px;

    /* logo 胶囊卡片：与主播列表 anchor-header-left 样式一致 */
    .logo-badge {
      display: inline-flex;
      align-items: center;
      height: 30px;
      width: 105px;
      padding-left: 11px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
    }

    .logo-icon {
      width: 1.375rem;
      height: 1.375rem;
      object-fit: cover;
      border-radius: 50%;
    }

    .title {
      padding-left: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
    }
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      cursor: pointer;
    }

    .header-left-logo {
      width: 26px;
      height: 24px;
    }

    .header-left-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color-primary);
    }
  }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 「返回列表」：白色文字按钮，字号与 CPU/RAM 等统计文字一致 */
  .back-list-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--text-color-primary, #ffffff);
    font-size: inherit;
    line-height: 1.25rem;
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: background-color 0.2s ease;

    svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  /* CPU/RAM/Frame Rate 统计文字已按产品要求隐藏 */
  .statistics {
    display: none !important;
    position: relative;
    align-items: center;
    &-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-right: 0.5rem;
    }
    &-text {
      font-style: normal;
      font-weight: 400;
      line-height: 1.25rem;
      color: var(--text-color-primary, #ffffff);
    }
    &-value {
      padding: 0 0.375rem;
      font-style: normal;
      font-weight: 400;
      line-height: 1.25rem;
      color: var(--text-color-primary, #ffffff);
    }
    &-space {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      display: inline-block;
      height: 0.75rem;
      width: 0.0625rem;
      background-color: var(--text-color-primary, #ffffff);
      margin-right: 0.5rem;
    }
  }

  .language-switch {
    position: relative;
    display: flex;
    align-items: center;
    -webkit-app-region: no-drag;
  }

  .language-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: var(--text-color-primary);
    cursor: pointer;
    font-size: 0.75rem;
    line-height: 1;
    transition: background-color 0.2s ease;
  }

  .language-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .language-icon {
    width: 1rem;
    height: 1rem;
  }

  .language-short {
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .language-arrow {
    width: 0.875rem;
    height: 0.875rem;
    transition: transform 0.2s ease;
  }

  .language-arrow.up-icon {
    transform: rotate(180deg);
  }

  .language-menu {
    position: absolute;
    top: 1.5rem;
    right: 0;
    z-index: 999;
    min-width: 7.5rem;
    padding: 0.125rem 0;
    border-radius: 0.375rem;
    background-color: var(--dropdown-color-default);
    box-shadow: 0px 1px 5px var(--shadow-color),
                0px 8px 12px var(--shadow-color),
                0px 12px 26px var(--shadow-color);
    -webkit-app-region: no-drag;
    display: flex;
    flex-direction: column;
  }

  .language-menu--windows-constrained {
    max-height: 4.5rem;
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .language-menu--windows-constrained::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .language-menu::before {
    content: '';
    position: absolute;
    right: 1rem;
    top: -0.625rem;
    width: 0rem;
    border-top: 0.375rem solid transparent;
    border-right: 0.375rem solid transparent;
    border-bottom: 0.375rem solid var(--dropdown-color-default);
    border-left: 0.375rem solid transparent;
  }

  .language-item {
    width: 100%;
    padding: 0.25rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--text-color-primary);
    font-size: 0.75rem;
    line-height: 1rem;
    text-align: left;
    cursor: pointer;
  }

  .language-label {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .language-item:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }

  .language-item.active {
    font-weight: 600;
    background-color: rgba(255, 255, 255, 0.12);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
    position: relative;

    .user-info-content {
      display: flex;
      align-items: center;
      cursor: pointer;
      -webkit-app-region: no-drag;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s ease;

      .header-right-name {
        max-width: 6.25rem;
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--text-color-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tui-live-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        border: none;
        background: transparent;
        color: var(--text-color-primary);
        cursor: pointer;
        padding: 0;
        margin: 0;
        margin-left: 0.25rem;

        .down-icon {
          transition: transform 0.2s ease;
        }

        .up-icon {
          transition: transform 0.2s ease;
          transform: rotate(180deg);
        }
      }
    }

    .user-control-container {
      position: absolute;
      top: 2.5rem;
      right: 0;
      z-index: 999;
      font-weight: normal;

      width: auto;
      min-width: 6.25rem;
      max-width: 10rem;
      height: auto;
      max-height: 10rem;
      overflow-y: auto;
      border-radius: 0.5rem;

      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;

      background-color: var(--dropdown-color-default);
      box-shadow: 0px 1px 5px var(--shadow-color),
                  0px 8px 12px var(--shadow-color),
                  0px 12px 26px var(--shadow-color);
      color: var(--text-color-primary);
      -webkit-app-region: no-drag;

      &::before {
        content: '';
        position: absolute;
        right: 1rem;
        top: -1.25rem;
        width: 0rem;
        border-top: 0.625rem solid transparent;
        border-right: 0.625rem solid transparent;
        border-bottom: 0.625rem solid var(--dropdown-color-default);
        border-left: 0.625rem solid transparent;
      }

      &::after {
        content: '';
        width: 100%;
        height: 1.25rem;
        position: absolute;
        left: 0rem;
        top: 1.25rem;
        background-color: transparent;
      }

      .user-control-item-foot {
        width: 100%;
        height: 100%;
        padding: 0 0.5rem 0 1rem;
        box-sizing: border-box;
        border-radius: 0.25rem;
        color: var(--text-color-primary);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        z-index: 999;
        line-height: 2.5rem;
        min-height: 2.5rem;
        min-width: 0;
        display: flex;
        align-items: center;

        .user-control-label {
          display: block;
          width: 100%;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        &:first-child {
          border-radius: 0.25rem 0.25rem 0 0;
        }

        &:last-child {
          border-radius: 0 0 0.25rem 0.25rem;
        }
      }
    }

    .btn-start-live {
      margin-right: 20px;
    }
  }

  .window-tool {
    display: flex;
    align-items: center;
    align-self: flex-end;
    height: 3rem;
    -webkit-app-region: no-drag;

    .tui-live-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      color: var(--text-color-primary, #ffffff);
      cursor: pointer;
      padding: 0;
      margin: 0;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      &:active {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }
}

</style>

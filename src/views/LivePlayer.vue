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

          <GiftEffect />

          <div v-if="errorText" class="player-status">{{ errorText }}</div>

          <div class="player-anchor">
            <img
              v-if="avatar && !avatarError"
              class="player-avatar"
              :src="avatar"
              alt=""
              @error="avatarError = true"
            />
            <span v-else class="player-avatar player-avatar-empty">{{ initial }}</span>
            <div class="player-anchor-info">
              <span class="player-anchor-name">{{ anchorName || '主播' }}</span>
              <span class="player-anchor-sub">{{ title }}</span>
            </div>
            <span class="player-live-badge">直播中</span>
          </div>

          <div class="player-actions">
            <button v-if="muted" class="player-action-btn" type="button" @click="toggleSound">
              点击开启声音
            </button>
          </div>
        </div>

        <aside class="player-side">
          <LiveChatPanel
            v-if="imReady"
            :room-id="roomId"
            :live-index-id="liveIndexId"
            show-gift-button
            @open-gift="giftPanelVisible = true"
            @user-click="handleUserClick"
          />
          <div v-else class="player-side-hint">{{ chatHint }}</div>
        </aside>
      </main>

      <GiftPanel
        :visible="giftPanelVisible"
        :live-index-id="liveIndexId"
        @close="giftPanelVisible = false"
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
import { TUILogin } from '@tencentcloud/tui-core-lite';
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
  onLiveImSystem,
  type LiveImSystemEvent,
} from '../niko/im/liveIm';
import { getAudienceCardInfo, type AudienceCardInfo } from '../niko/api/live';
import LiveChatPanel from '../niko/components/LiveChatPanel.vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import GiftPanel from '../niko/components/GiftPanel.vue';
import UserInfoCard from '../niko/components/UserInfoCard.vue';

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
// play_url 带签名参数，通过 history.state 传递（H5 项目同样做法）
const playUrl = String((window.history.state as Record<string, unknown> | null)?.playUrl || '');

const { login, loginUserInfo } = useLoginState();

const videoEl: Ref<HTMLVideoElement | null> = ref(null);
const errorText = ref('');
const muted = ref(true);
const avatarError = ref(false);
const initial = computed(() => (anchorName || 'N').slice(0, 1).toUpperCase());
const imReady = ref(false);
const chatHint = ref('聊天连接中...');
const giftPanelVisible = ref(false);
const userCardVisible = ref(false);
const userCardLoading = ref(false);
const userCardInfo: Ref<AudienceCardInfo | null> = ref(null);

let playerHandle: StreamPlayerHandle | null = null;
let unsubscribeSystem: (() => void) | null = null;
let destroyed = false;

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
    // loginUserInfo 可能是旧会话残留，必须同时确认 chat 实例存在
    if (!loginUserInfo.value?.userId || !TUILogin.getContext()?.chat) {
      await login({
        sdkAppId: Number(sdkAppId),
        userId: String(userId),
        userSig: String(userSig),
      });
      console.log('[LivePlayer] TUIKit IM login success:', userId);
    }
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

/** 下播 / 禁播 / 封禁 / 警告（对齐 web-obs-live ChatRoom 的 53、118、system_aide） */
async function handleSystemEvent(event: LiveImSystemEvent) {
  if (event.kind === 'system' && !event.stop) {
    try {
      await TUIMessageBox({
        title: '系统提示',
        message: event.reason,
        confirmButtonText: '确定',
      });
    } catch (error) {
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
    } catch (error) {
      // 用户关闭弹窗
    }
    return;
  }
  if (!event.stop) {
    return;
  }
  const title = event.kind === 'ended' ? '直播已结束' : '封禁提示';
  const message = event.reason || (event.kind === 'ended' ? '主播已结束直播' : '直播间已被封禁');
  try {
    await TUIMessageBox({ title, message, confirmButtonText: '确定' });
  } catch (error) {
    // 用户关闭弹窗
  }
  destroyed = true;
  void leaveLiveChat();
  router.replace({ name: 'anchor-list' });
}

function toggleSound() {
  const el = videoEl.value;
  if (!el) {
    return;
  }
  el.muted = false;
  void el.play().catch(() => undefined);
  muted.value = false;
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
  try {
    const handle = await createStreamPlayer(el, playUrl, {
      muted: false,
      onError: (detail) => {
        console.warn('[LivePlayer] stream error:', detail);
        errorText.value = '直播已结束或拉流失败';
      },
    });
    // 播放器初始化期间页面已退出时立即回收
    if (destroyed) {
      handle.destroy();
      return;
    }
    playerHandle = handle;
    // 自动播放被拦截时会自动静音，这里同步按钮状态
    muted.value = el.muted;
  } catch (error) {
    console.error('[LivePlayer] play failed:', error);
    errorText.value = '直播播放失败';
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
  void startPlayback();
  void initChat();
});

onBeforeUnmount(() => {
  destroyed = true;
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  playerHandle?.destroy();
  playerHandle = null;
  // 退出直播间时离开 IM 群；保留 IM 登录态，去开播时直接复用同一会话
  void leaveLiveChat();
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
  top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 1.25rem;
  background-color: rgba(0, 0, 0, 0.45);

  .player-avatar {
    width: 1.75rem;
    height: 1.75rem;
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

  .player-anchor-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
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

  .player-live-badge {
    flex: none;
    padding: 0 0.375rem;
    font-size: 0.625rem;
    line-height: 1rem;
    color: #fff;
    border-radius: 0.125rem;
    background-color: #f04142;
  }
}

.player-actions {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-action-btn {
  height: 2rem;
  padding: 0 0.875rem;
  font-size: 0.75rem;
  color: #fff;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 1rem;

  &:hover {
    background-color: rgba(0, 0, 0, 0.75);
  }
}
</style>

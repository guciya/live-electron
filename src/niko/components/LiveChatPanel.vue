<template>
  <div class="niko-chat">
    <div v-if="!disabled" class="niko-chat-notice">
      <div class="niko-chat-notice-title">平台提醒</div>
      <div class="niko-chat-notice-body">{{ LIVE_NOTICE_TEXT }}</div>
    </div>
    <div ref="listRef" class="niko-chat-list">
      <div v-if="messages.length === 0" class="niko-chat-empty">
        {{ disabled ? t('Live not started') : (connected ? t('No messages yet') : t('Connecting')) }}
      </div>
      <template v-for="message in messages" :key="message.id">
        <div v-if="message.kind === 'join'" class="niko-chat-line niko-chat-line--join">
          <span class="niko-chat-tag">来了</span>
          <span class="niko-chat-join-name" @click="handleUserClick(message)">{{ message.nickname }}</span>
          <span class="niko-chat-join-text">进入了直播间</span>
        </div>
        <div v-else-if="message.kind === 'gift'" class="niko-chat-line niko-chat-line--gift">
          <span class="niko-chat-user" @click="handleUserClick(message)">
            <img v-if="roleIcon(message)" class="niko-chat-role-icon" :src="roleIcon(message)" alt="" />
            <img
              v-if="message.extra?.levelCardIcon"
              class="niko-chat-level-icon"
              :src="resolveImageUrl(message.extra.levelCardIcon)"
              alt=""
            />
            <img
              v-if="message.extra?.medalImage"
              class="niko-chat-medal-icon"
              :src="resolveImageUrl(message.extra.medalImage)"
              alt=""
            />
            <span class="niko-chat-name" :style="nicknameStyle(message)">{{ message.nickname }}</span>
          </span>
          <span class="niko-chat-tag niko-chat-tag--gift">礼物</span>
          <span class="niko-chat-text">送出了 {{ message.text }}</span>
        </div>
        <div v-else class="niko-chat-line">
          <span class="niko-chat-user" @click="handleUserClick(message)">
            <img v-if="roleIcon(message)" class="niko-chat-role-icon" :src="roleIcon(message)" alt="" />
            <img
              v-if="message.extra?.levelCardIcon"
              class="niko-chat-level-icon"
              :src="resolveImageUrl(message.extra.levelCardIcon)"
              alt=""
            />
            <img
              v-if="message.extra?.medalImage"
              class="niko-chat-medal-icon"
              :src="resolveImageUrl(message.extra.medalImage)"
              alt=""
            />
            <span class="niko-chat-name" :style="nicknameStyle(message)">{{ message.nickname }}：</span>
          </span>
          <span class="niko-chat-text">{{ message.text }}</span>
        </div>
      </template>
    </div>
    <div class="niko-chat-input">
      <input
        v-model="draft"
        class="niko-chat-field"
        :disabled="disabled"
        :placeholder="disabled ? t('Live not started') : t('Say something')"
        @keyup.enter="handleSend"
      />
      <button
        class="niko-chat-send"
        @click="handleSend"
      >
        {{ t('Send') }}
      </button>
      <button
        v-if="showGiftButton"
        class="niko-chat-gift"
        type="button"
        title="礼物"
        aria-label="礼物"
        :disabled="disabled"
        @click="emit('open-gift')"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 12v9H4v-9" />
          <path d="M2 7h20v5H2z" />
          <path d="M12 21V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { sendLiveMessage } from '../api/live';
import { resolveImageUrl } from '../config';
import {
  joinLiveChat,
  isLiveChatConnected,
  onLiveImMessage,
  type LiveImMessage,
} from '../im/liveIm';
import boIcon from '../assets/role/bo.png';
import xunIcon from '../assets/role/xun.png';
import guanIcon from '../assets/role/guan.png';

/** 与 H5 niko/constants 的 LIVE_NOTICE_TEXT 完全一致 */
const LIVE_NOTICE_TEXT = 'Niko直播提醒绿色、文明、正能量直播，严禁未成年人进行直播或打赏。封面和直播内容严禁违法违规，低俗色情、吸烟酗酒等内容。如主播在直播过程中出现炫耀、送礼物等方式诱导误导打赏、私下交易，请谨慎判断，以防上当或财产损失。请大家注意财产安全，谨防网络诈骗。远离娱乐，合理消费，理性打赏。';

/** 主播 / 巡场 / 管理员角标，与 H5 NikoBarrage List 一致 */
const ROLE_ICON = {
  anchor: boIcon,
  super: xunIcon,
  manager: guanIcon,
};

const props = defineProps<{
  /** IM 群 ID（= 后端 room_id） */
  roomId: string;
  /** 后端直播场次 ID，发送弹幕时使用 */
  liveIndexId: string | number;
  disabled?: boolean;
  /** 是否在发送按钮右侧展示「礼物」按钮 */
  showGiftButton?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-gift'): void;
  (e: 'user-click', payload: { userId: string; isMystery: boolean }): void;
}>();

const { t } = useUIKit();
const messages = ref<LiveImMessage[]>([]);
const draft = ref('');
const sending = ref(false);
const connected = ref(false);
const listRef = ref<HTMLElement | null>(null);
const MAX_MESSAGES = 200;

let unsubscribe: (() => void) | null = null;

function scrollToBottom() {
  nextTick(() => {
    const el = listRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

/** 身份角标：主播 / 巡场 / 管理员，对齐 H5 的 roleIcon 优先级 */
function roleIcon(message: LiveImMessage): string {
  const extra = message.extra;
  if (!extra) {
    return '';
  }
  if (extra.isAnchor) {
    return ROLE_ICON.anchor;
  }
  if (extra.isSuper) {
    return ROLE_ICON.super;
  }
  if (extra.isManager) {
    return ROLE_ICON.manager;
  }
  return '';
}

/** 昵称颜色：等级色优先，其次管理员/巡场/主播固定色（对齐 H5） */
function nicknameStyle(message: LiveImMessage) {
  const extra = message.extra;
  if (extra?.levelColor) {
    return { color: extra.levelColor };
  }
  if (extra?.isManager) {
    return { color: '#ff6b6b' };
  }
  if (extra?.isSuper) {
    return { color: '#ffd479' };
  }
  if (extra?.isAnchor) {
    return { color: '#7ee787' };
  }
  return {};
}

/** 点击昵称/等级/勋章时通知外层弹出用户信息卡片（对齐 web-obs-live） */
function handleUserClick(message: LiveImMessage) {
  if (!message.fromUserId) {
    return;
  }
  emit('user-click', {
    userId: message.fromUserId,
    isMystery: !!message.extra?.isMystery,
  });
}

async function handleSend() {
  const content = draft.value.trim();
  if (!content || props.disabled || sending.value || !props.liveIndexId) {
    return;
  }
  sending.value = true;
  try {
    // 与 web-obs-live 一致：走后端接口转发到 IM 群，手机端才能收到
    await sendLiveMessage({ liveIndexId: props.liveIndexId, message: content });
    draft.value = '';
  } catch (error: any) {
    console.warn('[NikoChat] send failed:', error?.message || error);
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  unsubscribe = onLiveImMessage((message) => {
    messages.value.push(message);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
    scrollToBottom();
  });
});

watch(
  () => props.roomId,
  async (roomId) => {
    if (!roomId) {
      return;
    }
    messages.value = [];
    try {
      await joinLiveChat(String(roomId));
      connected.value = isLiveChatConnected();
    } catch (error: any) {
      console.warn('[NikoChat] joinLiveChat failed:', error?.message || error);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

<style scoped>
.niko-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.niko-chat-notice {
  flex: 0 0 auto;
  margin: 8px 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  /* 浅蓝色背景的平台提示 */
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.28);
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
  line-height: 17px;
}

.niko-chat-notice-title {
  margin-bottom: 3px;
  color: #66b1ff;
  font-size: 12px;
  font-weight: 600;
}

.niko-chat-notice-body {
  /* 完整展示合规提醒，不再内部截断滚动 */
  white-space: normal;
  /* 文字从左到右循环闪动（流光扫过效果） */
  background: linear-gradient(90deg, #8fc1ff 0%, #8fc1ff 42%, #ffffff 50%, #8fc1ff 58%, #8fc1ff 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: niko-notice-flow 3s linear infinite;
}

/* background-size 200% 且背景平铺，200% → 0 的位移恰好无缝循环，亮带从左向右扫过 */
@keyframes niko-notice-flow {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: 0 0;
  }
}

.niko-chat-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 20px;
}

.niko-chat-empty {
  color: var(--uikit-color-text-secondary, #888);
  font-size: 12px;
  padding: 6px 0;
}

.niko-chat-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.32);
  word-break: break-all;
}

/* 身份角标 / 等级牌 / 勋章：与 H5 弹幕一致的图标尺寸 */
.niko-chat-role-icon,
.niko-chat-level-icon,
.niko-chat-medal-icon {
  flex: none;
  height: 18px;
  object-fit: contain;
}

.niko-chat-level-icon {
  height: 20px;
}

.niko-chat-name {
  color: #ffd479;
  font-weight: 600;
}

.niko-chat-text {
  color: var(--uikit-color-text-primary, #fff);
}

/* 进房提示：灰蓝色小字，避免和弹幕抢视觉 */
.niko-chat-line--join {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.niko-chat-join-name {
  color: #66b1ff;
}

.niko-chat-join-text {
  color: rgba(255, 255, 255, 0.45);
}

/* 礼物提示：金色高亮 */
.niko-chat-line--gift {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(255, 184, 61, 0.12);
}

.niko-chat-line--gift .niko-chat-name {
  color: #ffb83d;
}

.niko-chat-line--gift .niko-chat-text {
  color: rgba(255, 226, 178, 0.92);
}

.niko-chat-tag {
  flex: 0 0 auto;
  padding: 0 5px;
  height: 16px;
  line-height: 16px;
  border-radius: 4px;
  background: rgba(102, 177, 255, 0.16);
  color: #66b1ff;
  font-size: 11px;
}

.niko-chat-tag--gift {
  background: rgba(255, 184, 61, 0.18);
  color: #ffb83d;
}

.niko-chat-input {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--uikit-color-divider, rgba(255, 255, 255, 0.1));
}

.niko-chat-field {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 12px;
  border-radius: 17px;
  border: 1px solid var(--uikit-color-divider, rgba(255, 255, 255, 0.15));
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  outline: none;
  font-size: 13px;
  transition: border-color 0.15s ease;
}

.niko-chat-field:focus {
  border-color: var(--uikit-color-primary, #2b7fff);
}

.niko-chat-field::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.niko-chat-send {
  flex: none;
  height: 34px;
  padding: 0 16px;
  border-radius: 17px;
  border: none;
  background: var(--uikit-color-primary, #2b7fff);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.niko-chat-send:hover:not(:disabled) {
  filter: brightness(1.1);
}

.niko-chat-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.niko-chat-gift {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  border: none;
  /* 与发送按钮同色（主题蓝） */
  background: var(--uikit-color-primary, #2b7fff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(43, 127, 255, 0.35);
  transition: filter 0.15s ease, transform 0.15s ease;
}

.niko-chat-gift:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.niko-chat-gift:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 昵称/等级区域可点击，弹出用户信息卡片 */
.niko-chat-user {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.niko-chat-user:hover .niko-chat-name {
  text-decoration: underline;
}

.niko-chat-join-name {
  cursor: pointer;
}

.niko-chat-join-name:hover {
  text-decoration: underline;
}
</style>

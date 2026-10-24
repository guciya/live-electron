<template>
  <div class="niko-chat">
    <div ref="listRef" class="niko-chat-list">
      <div v-if="messages.length === 0" class="niko-chat-empty">
        {{ connected ? t('No messages yet') : t('Connecting') }}...
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="niko-chat-item"
      >
        <span class="niko-chat-name">{{ message.nickname }}：</span>
        <span class="niko-chat-text">{{ message.text }}</span>
      </div>
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
        :disabled="disabled || !draft.trim() || sending"
        @click="handleSend"
      >
        {{ t('Send') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { sendLiveMessage } from '../api/live';
import {
  joinLiveChat,
  isLiveChatConnected,
  onLiveImMessage,
  type LiveImMessage,
} from '../im/liveIm';

const props = defineProps<{
  /** IM 群 ID（= 后端 room_id） */
  roomId: string;
  /** 后端直播场次 ID，发送弹幕时使用 */
  liveIndexId: string | number;
  disabled?: boolean;
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

async function handleSend() {
  const content = draft.value.trim();
  if (!content || props.disabled || sending.value || !props.liveIndexId) {
    return;
  }
  sending.value = true;
  try {
    // 与 web-obs-live 一致：走后端接口转发到 IM 群，手机端才能收到
    await sendLiveMessage({ liveIndexId: props.liveIndexId, content });
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

.niko-chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 20px;
}

.niko-chat-empty {
  color: var(--uikit-color-text-secondary, #888);
  font-size: 12px;
}

.niko-chat-item {
  word-break: break-all;
  padding: 2px 0;
}

.niko-chat-name {
  color: var(--uikit-color-primary, #2b7fff);
}

.niko-chat-text {
  color: var(--uikit-color-text-primary, #fff);
}

.niko-chat-input {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--uikit-color-divider, rgba(255, 255, 255, 0.1));
}

.niko-chat-field {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--uikit-color-divider, rgba(255, 255, 255, 0.15));
  background: var(--uikit-color-bg-secondary, rgba(255, 255, 255, 0.06));
  color: inherit;
  outline: none;
  font-size: 13px;
}

.niko-chat-send {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: none;
  background: var(--uikit-color-primary, #2b7fff);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.niko-chat-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

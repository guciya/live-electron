<template>
  <div v-if="visible" class="msg-mask" @click="emit('close')">
    <div class="msg-panel" @click.stop>
      <!-- 头部 -->
      <div class="msg-head">
        <div class="msg-head-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.5 11.5a7.5 7.5 0 0 1-11 6.7L4 20l1.6-4.4a7.5 7.5 0 1 1 14.9-4.1z" />
            <path d="M9 11h6M9 14.5h3.5" />
          </svg>
          <span>消息中心</span>
          <span v-if="totalUnread > 0" class="msg-head-unread">{{ totalUnread > 99 ? '99+' : totalUnread }}</span>
        </div>
        <button class="msg-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
      </div>

      <div class="msg-body">
        <!-- 左侧会话列表 -->
        <aside class="msg-side">
          <div v-if="convLoading && !conversations.length" class="msg-tip">加载中...</div>
          <div v-else-if="!conversations.length" class="msg-tip">暂无会话</div>
          <button
            v-for="conv in conversations"
            :key="conv.id"
            class="msg-conv"
            :class="{ active: currentId === conv.id }"
            type="button"
            @click="selectConv(conv)"
          >
            <span class="msg-conv-avatar-wrap">
              <img v-if="conv.avatar" class="msg-conv-avatar" :src="conv.avatar" alt="" />
              <span v-else class="msg-conv-avatar msg-conv-avatar-empty">{{ (conv.name || 'U').slice(0, 1).toUpperCase() }}</span>
            </span>
            <span class="msg-conv-main">
              <span class="msg-conv-name">{{ conv.name }}</span>
              <span class="msg-conv-last">{{ conv.lastText || '暂无消息' }}</span>
            </span>
            <span v-if="conv.unread > 0" class="msg-conv-unread">{{ conv.unread > 99 ? '99+' : conv.unread }}</span>
          </button>
        </aside>

        <!-- 右侧聊天区 -->
        <section class="msg-main">
          <div class="msg-main-head">
            <span class="msg-main-title">{{ currentConv?.name || '请选择会话' }}</span>
          </div>
          <div ref="msgScrollRef" class="msg-scroll">
            <div v-if="!currentId" class="msg-tip">点击左侧会话开始聊天</div>
            <div v-else-if="msgLoading && !messages.length" class="msg-tip">加载中...</div>
            <div v-else-if="!messages.length" class="msg-tip">暂无消息，快来发一条吧</div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="msg-item"
              :class="{ self: m.isSelf }"
            >
              <span class="msg-item-avatar-wrap">
                <img v-if="m.avatar" class="msg-item-avatar" :src="m.avatar" alt="" />
                <span v-else class="msg-item-avatar msg-item-avatar-empty">{{ (m.nick || (m.isSelf ? '我' : 'TA')).slice(0, 1).toUpperCase() }}</span>
              </span>
              <div class="msg-item-main">
                <span class="msg-item-nick">{{ m.isSelf ? '我' : m.nick }}</span>
                <div class="msg-bubble">{{ m.text }}</div>
              </div>
            </div>
          </div>
          <div class="msg-input-row">
            <input
              v-model="draft"
              class="msg-input"
              type="text"
              :disabled="!currentId"
              :placeholder="currentId ? '输入消息，回车发送' : '请先选择会话'"
              @keyup.enter="send"
            />
            <button
              class="msg-send-btn"
              type="button"
              :disabled="!currentId || !draft.trim() || sending"
              @click="send"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>发送</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';
import { TUILogin } from '@tencentcloud/tui-core-lite';
import { resolveImageUrl } from '../config';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

interface ConvItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  lastText: string;
  lastTime: number;
  unread: number;
}

interface MsgItem {
  id: string;
  isSelf: boolean;
  nick: string;
  avatar: string;
  text: string;
  time: number;
}

function getChat(): any {
  const chatFromLogin = (TUILogin as any).getContext?.()?.chat;
  const chat = chatFromLogin || (TUIChatEngine as any)?.chat;
  if (!chat) {
    throw new Error('IM 尚未登录');
  }
  return chat;
}

const conversations = ref<ConvItem[]>([]);
const currentId = ref('');
const messages = ref<MsgItem[]>([]);
const convLoading = ref(false);
const msgLoading = ref(false);
const sending = ref(false);
const draft = ref('');
const msgScrollRef = ref<HTMLElement | null>(null);

const currentConv = computed(() => conversations.value.find((c) => c.id === currentId.value));
const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0));

const myUserId = computed(() => {
  try {
    const chat = getChat();
    return String(chat?.getMyUserID?.() || (TUIChatEngine as any)?.getMyUserID?.() || '');
  } catch {
    return '';
  }
});

function isC2C(raw: any): boolean {
  if (!raw) return false;
  const type = String(raw.type || '');
  const id = String(raw.conversationID || '');
  return type === 'C2C' || id.startsWith('C2C');
}

function mapConversation(raw: any): ConvItem | null {
  if (!raw || !isC2C(raw)) return null;
  const profile = raw.userProfile || {};
  const userId = String(profile.userID || String(raw.conversationID || '').replace(/^C2C/, ''));
  return {
    id: String(raw.conversationID || ''),
    userId,
    name: String(profile.nick || userId || '用户'),
    avatar: resolveImageUrl(String(profile.avatar || '')),
    lastText: String(raw.lastMessage?.messageForShow || ''),
    lastTime: Number(raw.lastMessage?.lastTime || 0) * 1000,
    unread: Number(raw.unreadCount || 0),
  };
}

async function loadConversations() {
  convLoading.value = true;
  try {
    const chat = getChat();
    const res = await chat.getConversationList();
    const list: any[] = res?.data?.conversationList || [];
    conversations.value = list
      .map(mapConversation)
      .filter((c): c is ConvItem => !!c);
  } catch (error) {
    console.warn('[MessageCenter] loadConversations failed:', error);
  } finally {
    convLoading.value = false;
  }
}

function mapMessage(raw: any): MsgItem | null {
  if (!raw) return null;
  const type = String(raw.type || '');
  if (type !== 'TIMTextElem') return null;
  const from = String(raw.from || '');
  return {
    id: String(raw.ID || `${raw.time}-${Math.random()}`),
    isSelf: from === myUserId.value,
    nick: String(raw.nick || from),
    avatar: resolveImageUrl(String(raw.avatar || '')),
    text: String(raw.payload?.text || ''),
    time: Number(raw.time || 0) * 1000,
  };
}

async function loadMessages() {
  if (!currentId.value) return;
  msgLoading.value = true;
  try {
    const chat = getChat();
    const res = await chat.getMessageList({ conversationID: currentId.value });
    const list: any[] = res?.data?.messageList || [];
    messages.value = list
      .map(mapMessage)
      .filter((m): m is MsgItem => !!m);
    scrollToBottom();
  } catch (error) {
    console.warn('[MessageCenter] loadMessages failed:', error);
  } finally {
    msgLoading.value = false;
  }
}

async function selectConv(conv: ConvItem) {
  if (currentId.value === conv.id) return;
  currentId.value = conv.id;
  messages.value = [];
  await loadMessages();
  try {
    await getChat().setMessageRead({ conversationID: conv.id });
    conv.unread = 0;
  } catch (error) {
    console.warn('[MessageCenter] setMessageRead failed:', error);
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || !currentId.value || sending.value) return;
  sending.value = true;
  try {
    const chat = getChat();
    const userId = currentId.value.replace(/^C2C/, '');
    const message = chat.createTextMessage({
      to: userId,
      conversationType: 'C2C',
      payload: { text },
    });
    const res = await chat.sendMessage(message);
    const sent = res?.data?.message || res?.data || {};
    messages.value.push({
      id: String(sent.ID || `${Date.now()}`),
      isSelf: true,
      nick: '我',
      avatar: '',
      text,
      time: Number(sent.time || 0) * 1000 || Date.now(),
    });
    draft.value = '';
    scrollToBottom();
  } catch (error) {
    console.warn('[MessageCenter] send failed:', error);
  } finally {
    sending.value = false;
  }
}

function onMessageReceived(event: any) {
  const list: any[] = event?.data || [];
  let needScroll = false;
  list.forEach((raw) => {
    const mapped = mapMessage(raw);
    if (!mapped) return;
    if (String(raw.conversationID || '') === currentId.value) {
      messages.value.push(mapped);
      needScroll = true;
    }
  });
  if (needScroll) scrollToBottom();
  // 任何会话有新消息都刷新会话列表（未读数 / 最新一条）
  loadConversations();
}

function onConversationUpdated() {
  loadConversations();
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgScrollRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    try {
      const chat = getChat();
      chat.on('onMessageReceived', onMessageReceived);
      chat.on('onConversationListUpdated', onConversationUpdated);
    } catch (error) {
      console.warn('[MessageCenter] chat not ready:', error);
    }
    conversations.value = [];
    currentId.value = '';
    messages.value = [];
    draft.value = '';
    await loadConversations();
    const first = conversations.value[0];
    if (first) {
      await selectConv(first);
    }
  } else {
    try {
      const chat = getChat();
      chat.off('onMessageReceived', onMessageReceived);
      chat.off('onConversationListUpdated', onConversationUpdated);
    } catch {
      // ignore
    }
    currentId.value = '';
    messages.value = [];
    draft.value = '';
  }
});
</script>

<style lang="scss" scoped>
.msg-mask {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.msg-panel {
  display: flex;
  flex-direction: column;
  width: 46rem;
  height: 32rem;
  max-width: 92vw;
  max-height: 88vh;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(180deg, #23242b 0%, #191a20 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.875rem;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}

.msg-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.msg-head-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ff7aa2;
}

.msg-head-unread {
  min-width: 1.125rem;
  padding: 0 0.375rem;
  height: 1.125rem;
  line-height: 1.125rem;
  font-size: 0.6875rem;
  text-align: center;
  color: #fff;
  background: #ff3d71;
  border-radius: 999px;
}

.msg-close {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  font-size: 0.9375rem;
  cursor: pointer;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
}

.msg-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.msg-side {
  flex: none;
  width: 15rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.msg-conv {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  &.active {
    background: rgba(255, 122, 162, 0.12);
  }
}

.msg-conv-avatar-wrap {
  flex: none;
}

.msg-conv-avatar {
  display: block;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.msg-conv-avatar-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #7a5cff, #ff7aa2);
}

.msg-conv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.msg-conv-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg-conv-last {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg-conv-unread {
  flex: none;
  min-width: 1.125rem;
  padding: 0 0.3125rem;
  height: 1.125rem;
  line-height: 1.125rem;
  font-size: 0.6875rem;
  text-align: center;
  color: #fff;
  background: #ff3d71;
  border-radius: 999px;
}

.msg-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.msg-main-head {
  flex: none;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.msg-main-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
}

.msg-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.msg-tip {
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.45);
}

.msg-item {
  display: flex;
  gap: 0.625rem;

  &.self {
    flex-direction: row-reverse;

    .msg-item-main {
      align-items: flex-end;
    }

    .msg-bubble {
      background: linear-gradient(135deg, #ff7aa2, #ff3d71);
      color: #fff;
      border-radius: 0.75rem 0.25rem 0.75rem 0.75rem;
    }
  }
}

.msg-item-avatar-wrap {
  flex: none;
}

.msg-item-avatar {
  display: block;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.msg-item-avatar-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #7a5cff, #ff7aa2);
}

.msg-item-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 70%;
}

.msg-item-nick {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
}

.msg-bubble {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.25rem 0.75rem 0.75rem 0.75rem;
  word-break: break-word;
}

.msg-input-row {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.msg-input {
  flex: 1;
  min-width: 0;
  height: 2.25rem;
  padding: 0 0.875rem;
  font-size: 0.8125rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    border-color: rgba(255, 122, 162, 0.6);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.msg-send-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.25rem;
  padding: 0 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #ff7aa2, #ff3d71);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;

  &:hover:not(:disabled) {
    opacity: 0.92;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>

import { TUILogin } from '@tencentcloud/tui-core-lite';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';

/** 直播聊天消息（对齐 web-obs-live：文本消息 + 系统/礼物自定义消息） */
export interface LiveImMessage {
  id: string;
  fromUserId: string;
  nickname: string;
  avatar: string;
  text: string;
  time: number;
}

export interface LiveImMember {
  userId: string;
  nickname: string;
  avatar: string;
}

/**
 * 复用 TUIKit 已经登录好的 IM 实例（对齐 web-obs-live 的加群/监听逻辑）。
 *
 * 关键背景：之前这里用 LiteChat.create + chat.login 另起一套 IM 会话，
 * 同一账号二次登录会触发 LiteChat[kickedOut] type:multipleAccount，
 * 把 TUIKit 的会话踢下线 → TUIRoomEngine onKickedOffLine → 强制退出登录，
 * 表现为「点开始直播就跳回登录页」，直播同时被 LeaveTRTCRoom(reason:OnKickedOffline)，
 * 手机端也就看不到画面、聊天室断线。
 *
 * TUIKit 的登录走的是 tui-core-lite 的 TUILogin（useLoginState().login），
 * 其内部维护的 chat 实例就是 TUIChatEngine.chat，属于同一个会话。
 * 因此这里直接复用，绝不再次 login。
 */
const GROUP_TYPE_AV_CHAT_ROOM = 'AVChatRoom';
const EVENT_MESSAGE_RECEIVED = 'onMessageReceived';

let currentGroupId = '';
let lastRoomId = '';
let boundChat: any = null;
let memberListUnsupported = false;
const messageListeners = new Set<(message: LiveImMessage) => void>();
const memberListeners = new Set<(members: LiveImMember[]) => void>();

function getEngine(): any {
  return TUIChatEngine as any;
}

function getChat(): any {
  // 优先取 TUIKit 登录后建立的 chat 实例（useLoginState/TUILogin 内部同一个）
  const chatFromLogin = TUILogin.getContext()?.chat;
  const chat = chatFromLogin || getEngine()?.chat;
  if (!chat) {
    throw new Error('TUIKit IM 尚未登录完成');
  }
  return chat;
}

function emitMembers(members: LiveImMember[]): void {
  memberListeners.forEach((listener) => listener(members));
}

function toMessage(raw: any, text: string): LiveImMessage {
  return {
    id: String(raw.ID || raw.id || `${Date.now()}-${Math.random()}`),
    fromUserId: String(raw.from || ''),
    nickname: String(raw.nick || raw.from || ''),
    avatar: String(raw.avatar || ''),
    text,
    time: Number(raw.time || 0) * 1000 || Date.now(),
  };
}

/**
 * 对齐 web-obs-live：进房/观众数量通过群里的自定义消息（message_action 101 的
 * audience_info）下发，直播群（AVChatRoom）本身不支持拉取群成员列表。
 */
function applyAudienceInfo(custom: any): boolean {
  const messageData = custom?.message_data;
  if (!messageData) {
    return false;
  }
  const audienceInfo = messageData.audience_info || messageData.join_audience?.audience_info;
  if (!audienceInfo) {
    return false;
  }
  const list: any[] = Array.isArray(audienceInfo.audience_list)
    ? audienceInfo.audience_list
    : [];
  emitMembers(list.map((item) => ({
    userId: String(item.user_id ?? item.userId ?? ''),
    nickname: String(item.nickname || item.user_id || ''),
    avatar: String(item.avatar || ''),
  })));
  return true;
}

function handleRawMessage(raw: any): void {
  if (currentGroupId && raw?.to && String(raw.to) !== currentGroupId) {
    return;
  }

  if (raw?.type === 'TIMTextElem') {
    const text = String(raw.payload?.text || '');
    if (!text) {
      return;
    }
    // 后端也会把结构化事件（进房、飘屏等）以 JSON 文本下发
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const custom = JSON.parse(text);
        if (custom?.message_action === 101 && applyAudienceInfo(custom)) {
          return;
        }
        if (typeof custom?.message_action === 'number') {
          return;
        }
      } catch (error) {
        // 普通文本，继续按文本处理
      }
    }
    messageListeners.forEach((listener) => listener(toMessage(raw, text)));
    return;
  }

  if (raw?.type === 'TIMCustomElem') {
    const data = raw.payload?.data;
    if (!data) {
      return;
    }
    let custom: any = null;
    try {
      custom = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      return;
    }
    // 进房消息：同步在线观众列表（与 web-obs-live 一致）
    if (custom?.message_action === 101 && applyAudienceInfo(custom)) {
      return;
    }
    // 其余系统/礼物类消息：能取到文案就展示
    const text = custom?.content || custom?.text || custom?.msg || custom?.message_text || '';
    if (text) {
      messageListeners.forEach((listener) => listener(toMessage(raw, String(text))));
    }
    return;
  }

  // 部分端会以 TIMJoinGroupElem 下发进房信息
  if (raw?.message_data?.join_audience) {
    applyAudienceInfo({ message_data: raw.message_data });
  }
}

function bindListeners(chat: any): void {
  // TUILogin 每次重新登录都会重建 chat 实例，实例变化时需要重新绑定
  if (boundChat === chat) {
    return;
  }
  boundChat = chat;
  memberListUnsupported = false;
  if (currentGroupId) {
    currentGroupId = '';
  }
  chat.on(EVENT_MESSAGE_RECEIVED, (event: any) => {
    const list: any[] = Array.isArray(event?.data) ? event.data : [];
    list.forEach(handleRawMessage);
  });
}

async function doJoinGroup(roomId: string): Promise<void> {
  const chat = getChat();
  const res = await chat.joinGroup({
    groupID: roomId,
    type: GROUP_TYPE_AV_CHAT_ROOM,
  });
  const status = res?.data?.status ?? res?.status;
  currentGroupId = roomId;
  console.log('[NikoIM] joined group:', roomId, 'status:', status);
}

/** 加入直播 IM 群（群 ID = 后端 room_id），复用 TUIKit 已建立的登录态 */
export async function joinLiveChat(roomId: string): Promise<void> {
  lastRoomId = roomId;
  const chat = getChat();
  bindListeners(chat);
  if (currentGroupId === roomId) {
    await refreshMembers();
    return;
  }
  try {
    await doJoinGroup(roomId);
  } catch (error: any) {
    // 群可能刚由后端创建，稍后重试一次；仍失败则交给上层重试
    console.warn('[NikoIM] joinGroup failed, retry once:', error?.code || error?.message || error);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await doJoinGroup(roomId);
  }
  await refreshMembers();
}

export async function leaveLiveChat(): Promise<void> {
  if (!currentGroupId) {
    return;
  }
  const chat = boundChat || getEngine()?.chat || TUILogin.getContext()?.chat;
  if (chat) {
    try {
      await chat.quitGroup({ groupID: currentGroupId });
      console.log('[NikoIM] quit group:', currentGroupId);
    } catch (error) {
      // 忽略退出异常
    }
  }
  currentGroupId = '';
  lastRoomId = '';
}

/**
 * 刷新在线观众。
 * 直播群（AVChatRoom）不支持 getGroupMemberList，首次失败后不再重试；
 * 真正的观众列表由群里的进房自定义消息（action 101）实时更新。
 * 未入群时顺带重试一次加群，避免开播瞬间群还未就绪导致聊天室一直空着。
 */
export async function refreshMembers(): Promise<void> {
  if (!currentGroupId) {
    if (!lastRoomId) {
      return;
    }
    try {
      await joinLiveChat(lastRoomId);
    } catch (error) {
      // joinLiveChat 内部已打印，这里静默
    }
    return;
  }
  if (memberListUnsupported) {
    return;
  }
  try {
    const res = await getChat().getGroupMemberList({
      groupID: currentGroupId,
      count: 100,
      offset: 0,
    });
    const members: LiveImMember[] = (res?.memberList || res?.data?.memberList || []).map((item: any) => ({
      userId: String(item.userID || ''),
      nickname: String(item.nick || item.userID || ''),
      avatar: String(item.avatar || ''),
    }));
    emitMembers(members);
  } catch (error: any) {
    memberListUnsupported = true;
    console.log('[NikoIM] getGroupMemberList not supported for AVChatRoom, use join messages instead:', error?.code || error?.message || error);
  }
}

export function onLiveImMessage(listener: (message: LiveImMessage) => void): () => void {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

export function onLiveImMembers(listener: (members: LiveImMember[]) => void): () => void {
  memberListeners.add(listener);
  return () => memberListeners.delete(listener);
}

export function isLiveChatConnected(): boolean {
  return !!currentGroupId;
}

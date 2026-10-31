import { TUILogin } from '@tencentcloud/tui-core-lite';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';
import { resolveImageUrl } from '../config';

/** 直播聊天消息（对齐 web-obs-live：文本消息 + 系统/进房/礼物自定义消息） */
export interface LiveImMessage {
  id: string;
  /** chat=普通弹幕  join=进房提示  gift=礼物  system=系统提示 */
  kind: 'chat' | 'join' | 'gift' | 'system';
  fromUserId: string;
  nickname: string;
  avatar: string;
  text: string;
  time: number;
  /** 礼物消息额外字段（用于礼物特效） */
  gift?: LiveImGift;
  /** 等级/勋章/身份展示信息（对齐 H5 niko/im 与 web-obs-live 的 message_data 结构） */
  extra?: {
    levelColor?: string;
    levelCardIcon?: string;
    medalImage?: string;
    isManager?: boolean;
    isSuper?: boolean;
    isAnchor?: boolean;
    isMystery?: boolean;
  };
}

export interface LiveImGift {
  giftId: string;
  giftName: string;
  giftCount: number;
  giftIcon: string;
  /** VAP 特效资源，存在时优先播放动画 */
  effectUrl: string;
  configUrl: string;
  nickname: string;
  avatar: string;
  userId: string;
}

export interface LiveImMember {
  userId: string;
  nickname: string;
  avatar: string;
}

/** 直播结算数据（后端 action 118 下发，与 web-obs-live 的 LiveEndStats 对齐） */
export interface LiveSettleStats {
  liveDuration: string;
  audienceCount: number;
  newFansCount: number;
  raw: any;
}

/**
 * 直播间系统事件（对齐 web-obs-live ChatRoom）：
 * - warning：action 53 operate_type=0，仅警告，不中断直播
 * - forbidden：action 53 operate_type=1 或 system_aide 封禁文案，需终止直播
 * - ended：action 118 结算 / system_aide 断开直播，需终止直播
 * - system：其他 system_aide 系统提示
 */
export interface LiveImSystemEvent {
  kind: 'warning' | 'forbidden' | 'ended' | 'system';
  reason: string;
  /** 是否必须终止直播 / 退出直播间 */
  stop: boolean;
}

/**
 * 收到 PK / 连麦邀请（对齐 web-obs-live ChatRoom：message_type=6, message_action=106）
 */
export interface LivePkInvite {
  pkId: string;
  anchorId: string;
  nickname: string;
  avatar: string;
  /** 邀请等待时长（秒） */
  waitTimeout: number;
  raw: Record<string, any>;
}

/** PK 已开始（message_action=108），双方都需要展示 PK 条 */
export interface LivePkStarted {
  pkId: string;
  raw: Record<string, any>;
}

/** PK 结束 / 对方退出（message_action=110） */
export interface LivePkEnded {
  pkId: string;
  raw: Record<string, any>;
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
/** 收到过 action 101/102 的权威观众列表后，不再用群成员列表覆盖（两者顺序/成员不同，切换会闪） */
let audienceFromMessage = false;
const messageListeners = new Set<(message: LiveImMessage) => void>();
const memberListeners = new Set<(members: LiveImMember[]) => void>();
const giftListeners = new Set<(gift: LiveImGift) => void>();
const settleListeners = new Set<(stats: LiveSettleStats) => void>();
const pkInviteListeners = new Set<(invite: LivePkInvite) => void>();
const pkStartedListeners = new Set<(event: LivePkStarted) => void>();
const pkEndedListeners = new Set<(event: LivePkEnded) => void>();
const systemListeners = new Set<(event: LiveImSystemEvent) => void>();

/** 进房提示去重：同一个人在该时间窗内只提示一次（action 101 与群系统通知会重复推送） */
const JOIN_NOTICE_DEDUPE_MS = 10000;
const recentJoinNotices = new Map<string, number>();

/**
 * 观众资料缓存：部分观众列表更新消息只带 user_id（无昵称/头像），
 * 直接用会闪成 ID，这里用历史下发的昵称/头像补齐。
 */
const memberProfileCache = new Map<string, { nickname: string; avatar: string }>();

function mergeMemberProfiles(list: LiveImMember[]): LiveImMember[] {
  const merged = list.map((member) => {
    const cached = memberProfileCache.get(member.userId);
    // 昵称为空或与 userId 相同都视为「上游没给昵称的 ID 兜底」，优先用缓存
    const hasRealName = !!member.nickname && member.nickname !== member.userId;
    const nickname = !hasRealName && cached ? cached.nickname : member.nickname;
    const avatar = member.avatar || cached?.avatar || '';
    return { ...member, nickname, avatar };
  });
  merged.forEach((member) => {
    if (member.userId && member.nickname && member.nickname !== member.userId) {
      memberProfileCache.set(member.userId, { nickname: member.nickname, avatar: member.avatar });
    }
  });
  return merged;
}

function shouldEmitJoinNotice(key: string): boolean {
  const now = Date.now();
  const last = recentJoinNotices.get(key) || 0;
  if (now - last < JOIN_NOTICE_DEDUPE_MS) {
    return false;
  }
  recentJoinNotices.set(key, now);
  return true;
}

/** 当前登录用户身份：用于过滤「自己进入直播间」的提示（主播不需要看到自己进场） */
function isSelfIdentity(userId: string, nickname: string): boolean {
  try {
    const stored = window.localStorage.getItem('TUILiveKit-userInfo');
    const info = stored ? JSON.parse(stored) : {};
    const selfId = String(info?.userId || '');
    const selfName = String(info?.userName || info?.nickname || info?.name || '');
    if (selfId && userId && selfId === String(userId)) {
      return true;
    }
    if (selfName && nickname && selfName === String(nickname)) {
      return true;
    }
  } catch (error) {
    // 读取失败不过滤，保持原行为
  }
  return false;
}

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

function emitMessage(message: LiveImMessage): void {
  messageListeners.forEach((listener) => listener(message));
}

function emitGift(gift: LiveImGift): void {
  giftListeners.forEach((listener) => listener(gift));
}

function emitSystem(event: LiveImSystemEvent): void {
  console.log('[NikoIM] system event:', event.kind, event.reason);
  systemListeners.forEach((listener) => listener(event));
}

/** 消息年龄（秒），对齐全网 web-obs-live 的 30 秒过期过滤 */
function messageAge(raw: any): number {
  return Math.floor(Date.now() / 1000) - Number(raw?.time || 0);
}

function uniqueId(raw: any): string {
  return String(raw?.ID || raw?.id || `${Date.now()}-${Math.random()}`);
}

function messageTime(raw: any): number {
  return Number(raw?.time || 0) * 1000 || Date.now();
}

function toMessage(raw: any, text: string, kind: LiveImMessage['kind'] = 'chat'): LiveImMessage {
  return {
    id: uniqueId(raw),
    kind,
    fromUserId: String(raw?.from || ''),
    nickname: String(raw?.nick || raw?.from || ''),
    avatar: resolveImageUrl(String(raw?.avatar || '')),
    text,
    time: messageTime(raw),
    extra: buildExtra(raw?.message_data),
  };
}

/**
 * 解析等级牌/勋章/身份角标。
 * 前端要求：聊天消息前的等级图标用 level_icon（与 AudiencePanel 等其他面板保持一致）。
 */
function buildExtra(data: any): LiveImMessage['extra'] {
  if (!data) {
    return {};
  }
  const levelInfo = data.user_level_info || {};
  const medalInfo = data.adorn?.medal_info || {};
  return {
    levelColor: String(levelInfo.level_color || ''),
    levelCardIcon: String(levelInfo.level_icon || levelInfo.level_card_icon || levelInfo.level_gif_icon || ''),
    medalImage: String(medalInfo.medal_image || ''),
    isManager: !!data.is_manager,
    isSuper: !!data.is_super,
    isAnchor: !!data.is_anchor,
    isMystery: !!data.is_mystery,
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
  const audienceInfo = messageData.audience_info;
  if (!audienceInfo) {
    return false;
  }
  const list: any[] = Array.isArray(audienceInfo.audience_list)
    ? audienceInfo.audience_list
    : [];
  audienceFromMessage = true;
  emitMembers(mergeMemberProfiles(list.map((item) => ({
    userId: String(item.user_id ?? item.userId ?? ''),
    nickname: String(item.nickname || item.user_id || ''),
    avatar: resolveImageUrl(String(item.avatar || '')),
  }))));
  return true;
}

/** 处理进房提示：PC 端会额外插入一条「XXX 来了」聊天记录 */
function handleJoinNotice(custom: any, raw: any): void {
  const joinInfo = custom?.message_data?.join_audience;
  const audienceInfo = joinInfo?.show_audience_info || custom?.message_data?.audience_info;
  const nickname = String(audienceInfo?.nickname || audienceInfo?.user_id || '');
  if (!nickname) {
    return;
  }
  // 自己进入直播间不展示提示（观众列表与聊天室都不需要看到自己进场）
  if (isSelfIdentity(String(audienceInfo?.user_id || ''), nickname)) {
    return;
  }
  // 自己进群时 action 101 与 TIM 群系统通知（type=5）会各推一条，按人去重避免重复提示
  if (!shouldEmitJoinNotice(String(audienceInfo?.user_id || nickname))) {
    return;
  }
  emitMessage({
    id: `join-${uniqueId(raw)}`,
    kind: 'join',
    fromUserId: String(audienceInfo?.user_id || ''),
    nickname,
    avatar: resolveImageUrl(String(audienceInfo?.avatar || '')),
    text: '来了',
    time: messageTime(raw),
  });
}

/** 处理聊天弹幕（message_action 103） */
function handleChatMessage(custom: any, raw: any): void {
  const data = custom?.message_data || {};
  const text = String(custom?.message_text || custom?.content || '');
  if (!text) {
    return;
  }
  emitMessage({
    id: uniqueId(raw),
    kind: 'chat',
    fromUserId: String(data.user_id || raw?.from || ''),
    nickname: String(data.nickname || data.user_id || raw?.nick || ''),
    avatar: resolveImageUrl(String(data.avatar || raw?.avatar || '')),
    text,
    time: messageTime(raw),
    extra: buildExtra(data),
  });
}

/** 处理礼物消息（message_action 104）：弹幕一条 + 触发礼物特效 */
function handleGiftMessage(custom: any, raw: any): void {
  const data = custom?.message_data || {};
  const giftInfo = data.gift_info || {};
  const gift: LiveImGift = {
    giftId: String(giftInfo.gift_id || ''),
    giftName: String(giftInfo.gift_name || '礼物'),
    giftCount: Number(giftInfo.gift_count || 1),
    giftIcon: resolveImageUrl(String(giftInfo.gift_icon || giftInfo.gift_gif_icon || '')),
    effectUrl: resolveImageUrl(String(giftInfo.effect_url || giftInfo.gift_url || '')),
    configUrl: resolveImageUrl(String(giftInfo.gift_url_config || '')),
    nickname: String(data.nickname || '').trim() || '用户',
    avatar: resolveImageUrl(String(data.avatar || raw?.avatar || '')),
    userId: String(data.user_id || ''),
  };
  emitMessage({
    id: uniqueId(raw),
    kind: 'gift',
    fromUserId: gift.userId,
    nickname: gift.nickname,
    avatar: gift.avatar,
    text: `${gift.giftName} x${gift.giftCount}`,
    time: messageTime(raw),
    gift,
    extra: buildExtra(data),
  });
  emitGift(gift);
}

function handleCustomMessage(custom: any, raw: any): void {
  const action = Number(custom?.message_action);

  // 进房/离开（101/102）：同步观众列表，101 额外插入「来了」提示
  if (action === 101) {
    applyAudienceInfo(custom);
    handleJoinNotice(custom, raw);
    return;
  }
  if (action === 102) {
    applyAudienceInfo(custom);
    return;
  }
  // 聊天弹幕
  if (action === 103) {
    handleChatMessage(custom, raw);
    return;
  }
  // 礼物
  if (action === 104) {
    handleGiftMessage(custom, raw);
    return;
  }
  // 1001 飘屏弹幕：按普通聊天展示
  if (action === 1001) {
    const data = custom?.message_data || {};
    const text = String(custom?.message_text || custom?.content || '');
    if (text) {
      emitMessage({
        id: uniqueId(raw),
        kind: 'chat',
        fromUserId: String(data.user_id || raw?.from || ''),
        nickname: String(data.nickname || raw?.nick || ''),
        avatar: resolveImageUrl(String(data.avatar || '')),
        text,
        time: messageTime(raw),
      });
    }
    return;
  }
  // 直播结算（对齐 web-obs-live：message_action 118 携带本场数据）
  if (action === 118) {
    if (messageAge(raw) > 30) {
      console.log('[NikoIM] ignore expired settlement message:', messageAge(raw), 's');
      return;
    }
    const data = custom?.message_data || {};
    const stats: LiveSettleStats = {
      liveDuration: String(data.live_duration ?? ''),
      audienceCount: Number(data.audience_count ?? 0),
      newFansCount: Number(data.new_fans_count ?? 0),
      raw: data,
    };
    console.log('[NikoIM] settlement received:', stats);
    settleListeners.forEach((listener) => listener(stats));
    emitSystem({ kind: 'ended', reason: '直播已结束', stop: true });
    return;
  }
  // 警告 / 禁播 / 封禁（对齐 web-obs-live：message_action 53）
  if (action === 53) {
    const data = custom?.message_data || {};
    if (messageAge(raw) > 30) {
      console.log('[NikoIM] ignore expired action 53 message:', messageAge(raw), 's');
      return;
    }
    const reason = String(data.reason || '');
    const operateType = Number(data.operate_type ?? 0);
    if (operateType === 0) {
      emitSystem({ kind: 'warning', reason, stop: false });
    } else {
      // operate_type=1：禁用/封禁，必须终止直播
      emitSystem({ kind: 'forbidden', reason, stop: true });
    }
    return;
  }
  // PK / 连麦邀请（对齐 web-obs-live：message_type 6, message_action 106）
  if (action === 106) {
    const data = custom?.message_data || {};
    const pkId = String(data.pk_id ?? data.pkId ?? '');
    if (!pkId) {
      console.log('[NikoIM] ignore invalid pk invite:', data);
      return;
    }
    // 仅当消息带合法时间戳时才做过期过滤，避免 time 缺失时把有效邀请丢掉
    const time = Number(raw?.time || 0);
    if (time > 0 && messageAge(raw) > 60) {
      console.log('[NikoIM] ignore expired pk invite:', pkId, messageAge(raw), 's');
      return;
    }
    const invite: LivePkInvite = {
      pkId,
      anchorId: String(data.anchor_id ?? data.anchorId ?? ''),
      nickname: String(data.nickname ?? ''),
      avatar: resolveImageUrl(String(data.avatar ?? '')),
      waitTimeout: Number(data.wait_timeout ?? 15) || 15,
      raw: data,
    };
    console.log('[NikoIM] pk invite received:', invite);
    pkInviteListeners.forEach((listener) => listener(invite));
    return;
  }
  // PK 开始（包含自己接受后服务端下发的开始消息）
  if (action === 108) {
    const data = custom?.message_data || {};
    const pkId = String(data.pk_id ?? data.pkId ?? '');
    console.log('[NikoIM] pk started:', pkId, data);
    pkStartedListeners.forEach((listener) => listener({ pkId, raw: data }));
    return;
  }
  // PK 结束 / 对方退出
  if (action === 110) {
    const data = custom?.message_data || {};
    const pkId = String(data.pk_id ?? data.pkId ?? '');
    console.log('[NikoIM] pk ended:', pkId, data);
    pkEndedListeners.forEach((listener) => listener({ pkId, raw: data }));
    return;
  }
  // 其他系统动作不展示，避免刷屏
}

/** 从文本/自定义消息中解析出后端下发的 JSON 动作体 */
function parseCustomMessage(raw: any): any {
  if (raw?.type === 'TIMCustomElem') {
    const data = raw.payload?.data;
    if (!data) {
      return null;
    }
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      return null;
    }
  }
  if (raw?.type === 'TIMTextElem') {
    const text = String(raw.payload?.text || '');
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.message_action === 'number') {
          return parsed;
        }
      } catch (error) {
        // 普通文本，交给后续文本分支
      }
    }
  }
  return null;
}

function handleRawMessage(raw: any): void {
  // 系统助手 C2C 消息（下播 / 封禁通知），to 为用户自身，必须在群过滤之前处理
  if (raw?.type === 'TIMTextElem' && String(raw?.from || '') === 'system_aide') {
    const text = String(raw?.payload?.text || '');
    if (text && messageAge(raw) <= 30) {
      const stop = text.includes('断开直播') || text.includes('封禁');
      emitSystem({
        kind: stop ? 'forbidden' : 'system',
        reason: text,
        stop,
      });
    }
    return;
  }

  // 对齐 H5 niko/im：自定义消息（进房/聊天/礼物/系统动作）先处理，
  // 不再按 raw.to 过滤，避免群 ID 与后端 room_id 写法不一致时整批消息被丢掉
  const custom = parseCustomMessage(raw);
  if (custom) {
    handleCustomMessage(custom, raw);
    return;
  }

  if (raw?.type === 'TIMTextElem') {
    // 只有普通文本需要确认来自当前直播群
    if (currentGroupId && raw?.to && String(raw.to) !== currentGroupId) {
      return;
    }
    const text = String(raw?.payload?.text || '');
    if (text) {
      emitMessage(toMessage(raw, text));
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
    list.forEach((raw) => {
      // 便于排查「消息到了但没渲染」：打印消息类型与动作
      try {
        const payload = raw?.payload;
        const text = payload?.text;
        let action = '';
        if (payload?.data) {
          const parsed = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
          action = String(parsed?.message_action ?? '');
        } else if (typeof text === 'string' && text.startsWith('{')) {
          action = String(JSON.parse(text)?.message_action ?? '');
        }
        console.log('[NikoIM] message received:', raw?.type, 'action:', action || '-', 'to:', raw?.to);
      } catch (error) {
        // 日志失败不影响主流程
      }
      handleRawMessage(raw);
    });
  });

  // 群系统通知兜底：后端未下发 action 101 时，TIM 仍会推送「新成员入群」通知
  chat.on('onGroupSystemNoticeReceived', (notice: any) => {
    const info = notice?.data || notice || {};
    const type = Number(info?.type ?? notice?.type ?? 0);
    const nickname = String(
      info?.nick
      || info?.operatorInfo?.nick
      || info?.memberInfo?.nick
      || info?.payload?.nick
      || '',
    );
    console.log('[NikoIM] group system notice:', type, nickname);
    // 5=新成员入群 6=成员退群（TIMGroupSystemNoticeType）
    // 入群提示与 action 101 的 join_audience 去重，避免同一个人提示两次；自己不提示
    if (type === 5 && nickname && !isSelfIdentity('', nickname) && shouldEmitJoinNotice(nickname)) {
      emitMessage({
        id: `system-${Date.now()}-${Math.random()}`,
        kind: 'join',
        fromUserId: '',
        nickname,
        avatar: '',
        text: '来了',
        time: Date.now(),
      });
      return;
    }
    if (type === 6 && nickname) {
      emitMessage({
        id: `system-${Date.now()}-${Math.random()}`,
        kind: 'system',
        fromUserId: '',
        nickname,
        avatar: '',
        text: '离开了直播间',
        time: Date.now(),
      });
    }
  });
}

async function doJoinGroup(roomId: string): Promise<void> {
  const chat = getChat();
  const res = await chat.joinGroup({
    groupID: roomId,
    type: GROUP_TYPE_AV_CHAT_ROOM,
  });
  // 不同版本 SDK 返回结构不一致：
  // - Web / LiteChat：{ data: { status: 0|1 } }
  // - Electron TUIKit：返回里没有 status，只在日志里带 joinedStatus
  // 因此只有「明确拿到非 0/1 的状态」或「明确的错误码」时才判定加群失败。
  const rawStatus = res?.data?.status ?? res?.status;
  const status = Number(rawStatus);
  if (rawStatus != null && Number.isFinite(status) && status !== 0 && status !== 1) {
    throw new Error(`加入聊天室失败(status=${status})`);
  }
  const code = Number(res?.data?.code ?? res?.code ?? 0);
  if (code !== 0) {
    throw new Error(res?.data?.message || res?.message || `加入聊天室失败(code=${code})`);
  }
  currentGroupId = roomId;
  console.log('[NikoIM] joined group:', roomId, 'status:', rawStatus ?? 'unknown');
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
  console.log('[NikoIM] chat ready, listening messages on group:', currentGroupId);
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
  audienceFromMessage = false;
  // 退出直播间后清空进房提示去重记录，下次进房能正常提示
  recentJoinNotices.clear();
  // 观众资料缓存按房间生命周期清理，避免跨直播间复用
  memberProfileCache.clear();
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
  // 已有 action 101 下发的权威观众列表时，群成员列表会引入差异（缺主播/顺序不同）导致闪烁
  if (audienceFromMessage) {
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
      avatar: resolveImageUrl(String(item.avatar || '')),
    }));
    emitMembers(mergeMemberProfiles(members));
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

/** 礼物消息订阅（用于播放礼物特效），返回取消订阅函数 */
export function onLiveImGift(listener: (gift: LiveImGift) => void): () => void {
  giftListeners.add(listener);
  return () => giftListeners.delete(listener);
}

/** 直播间系统事件订阅（下播 / 禁播 / 封禁 / 警告） */
export function onLiveImSystem(listener: (event: LiveImSystemEvent) => void): () => void {
  systemListeners.add(listener);
  return () => systemListeners.delete(listener);
}

/** 收到 PK / 连麦邀请（被邀请方），返回取消订阅函数 */
export function onLiveImPkInvite(listener: (invite: LivePkInvite) => void): () => void {
  pkInviteListeners.add(listener);
  return () => pkInviteListeners.delete(listener);
}

/** PK 开始事件（双方都会收到 action 108） */
export function onLiveImPkStarted(listener: (event: LivePkStarted) => void): () => void {
  pkStartedListeners.add(listener);
  return () => pkStartedListeners.delete(listener);
}

/** PK 结束 / 对方退出事件 */
export function onLiveImPkEnded(listener: (event: LivePkEnded) => void): () => void {
  pkEndedListeners.add(listener);
  return () => pkEndedListeners.delete(listener);
}

/** 直播结算订阅（关播后展示结算面板），返回取消订阅函数 */
export function onLiveImSettle(listener: (stats: LiveSettleStats) => void): () => void {
  settleListeners.add(listener);
  return () => settleListeners.delete(listener);
}

export function isLiveChatConnected(): boolean {
  return !!currentGroupId;
}

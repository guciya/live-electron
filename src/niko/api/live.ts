import { request } from '../request';
import { toList, type NikoLiveListItem } from './liveList';

export interface LiveCategory {
  id: string | number;
  name: string;
}

export interface PrepareLiveInfo {
  live_category_list?: LiveCategory[];
  live_title?: string;
  live_cover?: string;
  live_category_id?: string | number;
  orientation?: string;
}

export interface PrepareLiveParams {
  liveTitle: string;
  liveCover: string;
  isCharge?: boolean;
  ticketPrice?: number;
  freePreviewDurationSecond?: number;
  orientation?: 'portrait' | 'landscape';
  liveCategoryId?: string | number;
  withOBS?: number;
}

export interface PrepareLiveResult {
  live_index_id: number;
  room_id: string;
  sign?: string;
  push_info?: {
    service: string;
    code: string;
    expire_second: number;
  };
}

/** 获取预开播信息（含分类列表） */
export function getPrepareLiveInfo(): Promise<PrepareLiveInfo> {
  return request.post('/live/prepareLiveInfo') as unknown as Promise<PrepareLiveInfo>;
}

/** 创建预开播 */
export function createPrepareLive(params: PrepareLiveParams): Promise<PrepareLiveResult> {
  return request.post('/live/createPrepareLive', params) as unknown as Promise<PrepareLiveResult>;
}

/** 关播 */
export function stopLive(params: { liveIndexId: number }): Promise<void> {
  return request.post('/live/stopLive', params) as unknown as Promise<void>;
}

/** 发送直播弹幕（后端转发到 IM 群，与 web-obs-live 一致） */
export function sendLiveMessage(params: {
  liveIndexId: string | number;
  message: string;
  replyUserId?: string;
}): Promise<void> {
  return request.post('/live/liveMessage', {
    liveIndexId: Number(params.liveIndexId),
    message: params.message,
    replyUserId: params.replyUserId,
  }) as unknown as Promise<void>;
}

// ==================== 连麦 / PK ====================

/** 可发起连麦/PK 的主播列表项 */
export interface PkAnchorItem {
  user_id?: string | number;
  anchor_id?: string | number;
  nickname?: string;
  avatar?: string;
  user_show_id?: string;
  is_live?: number;
  [key: string]: any;
}

/**
 * 查询正在开播的主播列表（连麦/PK 弹窗用）。
 * 与 web-obs-live 的 getLiveAnchorList、H5 的 getPkAnchorList 是同一个接口。
 */
export function getPkAnchorList(
  keyword = '',
  page = 1,
  pageSize = 20,
  isFriend = 0,
): Promise<PkAnchorItem[] | { list?: PkAnchorItem[]; data?: PkAnchorItem[]; total?: number }> {
  return request.post('/live/liveAnchorList', {
    keyword,
    isFriend,
    page,
    pageSize,
  }) as unknown as Promise<any>;
}

/** 发起 PK / 连麦邀请；pkId 为可选参数（已有 PK 时继续拉人） */
export function invitePk(invitedAnchorId: string | number, pkId?: string | number): Promise<unknown> {
  return request.post('/live/invitePk', {
    invitedAnchorId: String(invitedAnchorId),
    ...(pkId != null && pkId !== '' ? { pkId: String(pkId) } : {}),
  }) as unknown as Promise<unknown>;
}

/** 应答 PK 邀请：replyStatus 1=接受，0=拒绝 */
export function replyPk(replyStatus: 0 | 1, pkId: string | number): Promise<unknown> {
  return request.post('/live/replyPk', {
    replyStatus,
    pkId: String(pkId),
  }) as unknown as Promise<unknown>;
}

// ==================== 礼物 ====================

export interface GiftCategory {
  id: string | number;
  name?: string;
}

export interface GiftItem {
  id: string | number;
  gift_name?: string;
  gift_price?: number | string;
  gift_image?: string;
  effect_url?: string;
  gift_type?: string | number;
  gift_count?: number;
  [key: string]: any;
}

/** 礼物分类 */
export function getGiftCategory(): Promise<{ categories?: GiftCategory[] } & GiftCategory[]> {
  return request.post('/live/giftCategory') as unknown as Promise<any>;
}

/** 某个分类下的礼物列表 */
export function getLiveGiftList(params: {
  anchorId: string | number;
  giftCategory: string | number;
}): Promise<{ gift_list?: GiftItem[] }> {
  return request.post('/live/liveGiftList', {
    anchorId: Number(params.anchorId),
    giftCategory: Number(params.giftCategory),
  }) as unknown as Promise<any>;
}

/** 背包礼物列表 */
export function getBackpackGiftList(): Promise<{ gift_list?: GiftItem[] }> {
  return request.post('/live/backpackGiftList') as unknown as Promise<any>;
}

/** 刷礼物 */
export function sendLiveGift(data: {
  liveIndexId: string | number;
  giftId: string | number;
  giftCount: number;
  effectUrl?: string;
}): Promise<unknown> {
  return request.post('/live/sendLiveGift', {
    liveIndexId: Number(data.liveIndexId),
    giftId: String(data.giftId),
    giftCount: Number(data.giftCount) || 1,
    ...(data.effectUrl ? { effectUrl: data.effectUrl } : {}),
  }) as unknown as Promise<unknown>;
}

/** 送背包礼物 */
export function sendLiveBackpackGift(data: {
  liveIndexId: string | number;
  giftId: string | number;
  giftCount: number;
  effectUrl?: string;
}): Promise<unknown> {
  return request.post('/live/sendLiveBackpackGift', {
    liveIndexId: Number(data.liveIndexId),
    giftId: String(data.giftId),
    giftCount: Number(data.giftCount) || 1,
    ...(data.effectUrl ? { effectUrl: data.effectUrl } : {}),
  }) as unknown as Promise<unknown>;
}

// ==================== 用户信息卡片 ====================

/** 观众卡片信息（字段与 web-obs-live UserInfoDialog 对齐） */
export interface AudienceCardInfo {
  user_id?: string | number;
  nickname?: string;
  avatar?: string;
  gender?: number;
  age?: number;
  user_show_id?: string | number;
  introduction?: string;
  user_location?: string;
  user_level?: number;
  fans_count?: number;
  contribution?: number;
  is_attention?: number | boolean;
  is_mystery?: number | boolean;
  user_level_info?: {
    level_name?: string;
    level_color?: string;
    level_icon?: string;
    level_card_icon?: string;
  };
  vip_info?: {
    vip_name?: string;
    vip_icon?: string;
  };
  adorn?: {
    frame?: { frame_image?: string; image_type?: number };
  };
  [key: string]: any;
}

/** 点击聊天室用户/等级时拉取用户卡片 */
export function getAudienceCardInfo(params: {
  audienceUserId: string | number;
  liveIndexId?: string | number;
}): Promise<{ audience_info?: AudienceCardInfo }> {
  return request.post('/live/audienceCardInfo', {
    audienceUserId: params.audienceUserId,
    ...(params.liveIndexId ? { liveIndexId: params.liveIndexId } : {}),
  }) as unknown as Promise<any>;
}

/** 在线观众列表项（对齐 web-obs-live RankingList 的字段） */
export interface LiveAudienceItem {
  user_id?: string | number;
  nickname?: string;
  user_show_id?: string | number;
  avatar?: string;
  gender?: number;
  is_mystery?: number | boolean;
  is_manager?: number | boolean;
  is_super?: number | boolean;
  is_anchor?: number | boolean;
  frame_info?: {
    frame_image?: string;
    icon?: string;
    url?: string;
    image_type?: number;
  };
  user_level_info?: {
    level_icon?: string;
    user_level_icon?: string;
    level_card_icon?: string;
    level_name?: string;
    user_level_name?: string;
    level_color?: string;
  };
  vip_info?: {
    vip_icon?: string;
    vip_name?: string;
  };
  [key: string]: any;
}

export interface LiveAudienceListResult {
  audience_list?: LiveAudienceItem[];
  audience_count?: number;
  [key: string]: any;
}

/** 在线观众列表（对齐 web-obs-live / H5：POST /live/audienceList，audiencesType=1） */
export function getAudienceList(params: {
  liveIndexId: string | number;
  audiencesType?: number;
}): Promise<LiveAudienceListResult> {
  return request.post('/live/audienceList', {
    liveIndexId: params.liveIndexId,
    audiencesType: params.audiencesType ?? 1,
  }) as unknown as Promise<any>;
}

/* ========== 主播中心 ========== */

export interface AnchorCenterData {
  user_id: number;
  user_show_id: number | string;
  nickname: string;
  avatar: string;
  age?: number;
  gender?: number;
  introduction?: string;
  organization_id?: number;
  max_withdraw?: string;
  withdraw?: number;
  is_withdraw_auth?: boolean;
  live_statistics: {
    revenue: number;
    live_duration: number;
    audience_count: number;
    consume_audience_count: number;
    new_fans_count: number;
  };
  anchor_level_info: {
    current_level_info: {
      level_id: number;
      level_name: string;
      experience: number;
      level_icon?: string;
      level_gif_icon?: string;
    };
    next_level_info?: {
      level_id: number;
      level_name: string;
      experience: number;
      level_icon?: string;
      level_gif_icon?: string;
    };
    level_experience?: number;
    diff_experience?: number;
  };
  organization_info?: {
    id: number;
    show_id: string;
    name: string;
    organization_mode?: number;
    is_creator?: boolean;
  };
}

/** 主播中心首页数据 */
export function getAnchorCenter(): Promise<AnchorCenterData> {
  return request.post('/live/anchorCenter') as unknown as Promise<AnchorCenterData>;
}

// ==================== 主播列表 ====================

export interface RecommendLiveListResult {
  list: NikoLiveListItem[];
  total: number;
}

// 请求去重：2 秒无感刷新 + 路由切换重复挂载时复用同一 Promise / 缓存结果
let recommendPending: Promise<RecommendLiveListResult> | null = null;
let recommendCached: RecommendLiveListResult | null = null;
let recommendRawLogged = false;

/**
 * 推荐在播主播列表（/live/recommendLiveList）。
 * 属业务域接口（VUE_APP_API_BASE_URL + 登录 Token），与 CMS 的 liveMonitorList 不同：
 * 鉴权走 request 公共实例，不能放到 liveList.ts 的 cmsRequest 里。
 * 外层结构未知，统一交给 liveList.ts 的 toList 兼容（list/data/items/records）。
 */
export async function fetchRecommendLiveList(
  page = 1,
  pageSize = 300,
  options: { force?: boolean } = {},
): Promise<RecommendLiveListResult> {
  if (!options.force) {
    if (recommendPending) {
      return recommendPending;
    }
    if (recommendCached) {
      return recommendCached;
    }
  }

  console.log('[RecommendLiveList] POST /live/recommendLiveList', { page, pageSize, force: !!options.force });
  const task = (request.post('/live/recommendLiveList', { page, pageSize }) as unknown as Promise<unknown>)
    .then((data) => {
      // 只打印一次原始结构，便于字段对不上时快速定位
      if (!recommendRawLogged) {
        recommendRawLogged = true;
        console.log('[RecommendLiveList] raw response:', data);
      }
      return toList(data);
    });
  recommendPending = task;
  try {
    const result = await task;
    recommendCached = result;
    return result;
  } finally {
    if (recommendPending === task) {
      recommendPending = null;
    }
  }
}

// ==================== 主播中心子页 ====================

/** 用户等级信息（多个接口共用的结构） */
export interface UserLevelInfo {
  user_level: number;
  user_level_name: string;
  user_level_icon?: string;
  level_gif_icon?: string;
}

/** 任务中心任务项 */
export interface AnchorTaskItem {
  task_id: number;
  task_name: string;
  task_icon?: string;
  /** 任务目标值（开播任务为秒数） */
  task_goal: number;
  reward_count: number;
  /** 奖励类型，2 = K币 */
  reward_type: number;
  task_start_time?: string;
  task_end_time?: string;
  task_desc?: string;
  is_complete: boolean;
  /** 任务进度（百分比数值，如 853 表示 853%） */
  progress: number;
}

/** GET 任务中心任务列表 */
export function getAnchorTaskList(): Promise<AnchorTaskItem[]> {
  return request.post('/live/anchorTaskList') as unknown as Promise<AnchorTaskItem[]>;
}

/** 任务收益明细项（字段未固定，页面做兼容展示） */
export interface AnchorTaskRevenueItem {
  revenue_id?: number;
  task_id?: number;
  task_name?: string;
  revenue_count?: number;
  revenue_type?: number;
  create_time?: string;
  [key: string]: unknown;
}

/** 任务收益汇总 */
export interface AnchorTaskRevenueResult {
  revenue_list: AnchorTaskRevenueItem[];
  total_revenue: number;
}

/** GET 任务收益明细 */
export function getAnchorTaskRevenueList(): Promise<AnchorTaskRevenueResult> {
  return request.post('/live/anchorTaskRevenueList') as unknown as Promise<AnchorTaskRevenueResult>;
}

/** 贡献榜单用户项 */
export interface ContributeUserItem {
  user_id: number;
  user_show_id: number;
  nickname: string;
  avatar?: string;
  gender?: number;
  age?: number;
  is_mystery?: boolean;
  introduction?: string;
  contribute: number;
  user_level_info?: UserLevelInfo;
  frame_info?: unknown;
  vip_business_card_info?: unknown;
}

/** GET 贡献榜单（contributeType 1/2/3，sortType 1/2） */
export function getContributeUserList(params: {
  page?: number;
  pageSize?: number;
  contributeType?: number;
  sortType?: number;
}): Promise<ContributeUserItem[]> {
  return request.post('/live/contributeUserList', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
    contributeType: params.contributeType ?? 1,
    sortType: params.sortType ?? 1,
  }) as unknown as Promise<ContributeUserItem[]>;
}

/** 直播设置 */
export interface AnchorLiveControl {
  anchor_id?: number;
  live_title?: string;
  live_cover?: string;
  live_category_id?: number;
  is_accept_invite_pk: boolean;
  is_accept_random_pk: boolean;
  is_accept_audio_call: boolean;
  is_accept_video_call: boolean;
  is_accept_search_by_stranger_pk: boolean;
  is_open_live_countdown: boolean;
  free_preview_duration: number;
  is_open_list_preview: boolean;
  followed_reply?: {
    reply_switch: boolean;
    reply_type: number;
    reply_content: string;
  };
  live_title_review?: { review_status: number; live_title: string };
  live_cover_review?: { review_status: number; live_cover: string };
  live_wishlist_gift?: unknown[];
}

/** GET 直播设置 */
export function getAnchorLiveControl(): Promise<AnchorLiveControl> {
  return request.post('/live/anchorLiveControl') as unknown as Promise<AnchorLiveControl>;
}

/** 付费名单 / 白名单用户 */
export interface AnchorWhitelistUser {
  user_id: number;
  user_show_id: number;
  nickname: string;
  avatar?: string;
  gender?: number;
  age?: number;
  introduction?: string;
  contribute?: number;
  is_whitelist?: boolean;
  user_level_info?: UserLevelInfo;
  user_level?: number;
  frame_info?: unknown;
  create_time?: string;
}

/** GET 付费名单（sortType 1 时间 / 2 贡献） */
export function getAnchorWhitelist(params: {
  sortType?: number;
  page?: number;
  pageSize?: number;
} = {}): Promise<AnchorWhitelistUser[]> {
  return request.post('/live/anchorWhitelist', {
    sortType: params.sortType ?? 1,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  }) as unknown as Promise<AnchorWhitelistUser[]>;
}

/** 管理员用户 */
export interface AnchorManagerUser {
  user_id: number;
  user_show_id: number;
  nickname: string;
  avatar?: string;
  gender?: number;
  age?: number;
  introduction?: string;
  is_manager?: boolean;
  user_level_info?: UserLevelInfo;
  frame_info?: unknown;
  appoint_time?: string;
}

/** GET 管理员列表 */
export function getAnchorManagerList(): Promise<AnchorManagerUser[]> {
  return request.post('/live/anchorManagerList') as unknown as Promise<AnchorManagerUser[]>;
}

/** 平台通知 */
export interface AnchorNotifyItem {
  id: number;
  title: string;
  message: string;
  message_type?: number;
  create_time?: string;
}

/** GET 平台通知列表 */
export function getAnchorNotifyList(): Promise<AnchorNotifyItem[]> {
  return request.post('/live/anchorNotifyList') as unknown as Promise<AnchorNotifyItem[]>;
}

// ==================== 人气榜 / 在线观众 ====================

/** 人气榜榜单用户 */
export interface AnchorRankUser {
  anchor_id?: number;
  user_show_id?: number;
  nickname: string;
  avatar?: string;
  rank: number;
  /** 人气值 */
  popularity: number;
  /** 距上一名差值 */
  diff_popularity?: number;
}

/** 当前主播自己的榜单信息 */
export interface AnchorRankSelfInfo {
  anchor_id: number;
  user_show_id: number;
  nickname: string;
  avatar?: string;
  rank: number;
  popularity: number;
  diff_popularity: number;
}

/** 抢热推推荐主播 */
export interface AnchorRankRecommendInfo {
  anchor_id: number;
  user_show_id: number;
  nickname: string;
  avatar?: string;
  anchor_info?: {
    is_live: boolean;
    anchor_level_info?: {
      anchor_level: number;
      anchor_level_name: string;
      anchor_level_icon?: string;
      anchor_level_gif_icon?: string;
    };
    live_info?: { live_index_id: number; room_id: string };
  };
}

export interface AnchorRankResult {
  rank_list: AnchorRankUser[];
  anchor_rank_info?: AnchorRankSelfInfo | null;
  recommend_anchor_info?: AnchorRankRecommendInfo | null;
  /** 抢热推本轮剩余秒数 */
  minute_rank_remain_second: number;
}

/** GET 人气榜（rankType 1 小时榜 / 2 主播日榜 / 3 抢热推） */
export function getAnchorRank(params: {
  liveIndexId: number;
  rankType: number;
  isEarlier?: number;
}): Promise<AnchorRankResult> {
  return request.post('/rank/anchorRank', {
    liveIndexId: params.liveIndexId,
    rankType: params.rankType,
    isEarlier: params.isEarlier ?? 0,
  }) as unknown as Promise<AnchorRankResult>;
}

/** GET 直播间贡献榜 */
export function getLiveContributeUserList(params: {
  liveIndexId: number;
}): Promise<ContributeUserItem[]> {
  return request.post('/live/liveContributeUserList', {
    liveIndexId: params.liveIndexId,
  }) as unknown as Promise<ContributeUserItem[]>;
}

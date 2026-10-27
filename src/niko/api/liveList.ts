import axios, { type AxiosResponse } from 'axios';
import { NIKO_CONFIG } from '../config';

/**
 * CMS 主播列表接口（默认 https://test-cms.nikolive.cn/live/liveMonitorList）。
 *
 * 该接口属于 CMS 管理后台，鉴权方式与直播业务接口不同：
 * Authorization 头直接放下面这个固定 token（非 Bearer、非业务登录 token）。
 * 该 token 只允许在本文件使用，不能挪到 niko/request.ts 的公共实例，
 * 否则会影响主播开播/关播等业务接口的鉴权。
 * 域名按环境切换（VUE_APP_CMS_BASE_URL，见 .env.test / .env.production）。
 */
const CMS_BASE_URL = NIKO_CONFIG.cmsBaseUrl;
const CMS_AUTH_TOKEN = NIKO_CONFIG.cmsAuthToken;

export interface NikoLiveListItem {
  /** 后端 live_index_id，主播开播时作为 TRTC 房间号 */
  liveIndexId: string;
  /** 后端 room_id，作为 IM 群组 ID */
  roomId: string;
  /** 主播 anchor_id */
  anchorUserId: string;
  /** 主播对外 ID */
  anchorShowId: string;
  nickname: string;
  title: string;
  cover: string;
  avatar: string;
  /** 付费直播 0=否 1=是 */
  isCharge: number;
  /** 0=未PK 1=PK中 2=PK连麦中 3=观众连麦中 */
  pkStatus: number;
  viewerCount: number;
  /** 主播性别 1=男 2=女 */
  gender: number;
  /** 画面方向：landscape=横屏 portrait=竖屏，未知为空 */
  orientation: '' | 'landscape' | 'portrait';
  /** 在线观众头像（前 3 个，用于卡片头像叠层展示） */
  audienceAvatars: string[];
  /** 所属组织/公会名称（无组织时为空） */
  organizationName: string;
  playUrl: string;
  /** 是否为置顶主播（来自 top_anchor_live_info） */
  isTop?: boolean;
}

interface RawAudienceItem {
  avatar?: string;
  is_online?: number | boolean;
}

interface RawLiveListItem {
  live_index_id?: string | number;
  room_id?: string;
  chat_room_id?: string;
  im_group_id?: string;
  group_id?: string;
  anchor_id?: string | number;
  user_show_id?: string | number;
  nickname?: string;
  live_title?: string;
  live_cover?: string;
  frontcover?: string;
  avatar?: string;
  is_charge?: number | boolean;
  pk_status?: number;
  gender?: number;
  audience_list?: RawAudienceItem[];
  live_info?: {
    width?: number;
    height?: number;
    audience_list?: RawAudienceItem[];
  };
  play_url?: string;
  /** recommendLiveList 用 play_info 对象，host 字段是播放 CDN 根域名 */
  play_info?: {
    host?: string;
    type?: number;
    stream?: string;
    live_name?: string;
    secret?: string;
    time?: string;
  };
  organization_info?: {
    organization_name?: string;
    name?: string;
    org_name?: string;
    [key: string]: any;
  } | null;
}

interface NikoApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const cmsRequest = axios.create({
  baseURL: CMS_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

cmsRequest.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  (config.headers as Record<string, unknown>).Authorization = CMS_AUTH_TOKEN;
  return config;
});

cmsRequest.interceptors.response.use(
  (response: AxiosResponse<NikoApiResponse>) => {
    const body = response.data;
    if (body?.code === 200) {
      return body.data as any;
    }
    console.warn('[CmsLiveList] response not ok:', response.config.url, {
      code: body?.code,
      message: body?.message,
    });
    return Promise.reject(new Error(body?.message || '主播列表加载失败'));
  },
  (error) => {
    const status = error?.response?.status;
    const body = error?.response?.data;
    console.error('[CmsLiveList] HTTP', status, error?.config?.url, body);
    const bodyMessage = typeof body === 'string' ? body.slice(0, 200) : body?.message;
    return Promise.reject(new Error(bodyMessage || error.message || '网络异常'));
  },
);

/**
 * 字段归一化。
 * room_id 在不同接口下命名不一致（room_id / chat_room_id / im_group_id / group_id），
 * 与 H5 项目 liveList.ts 保持同样的兼容策略。
 */
/**
 * 用 play_info 组装 flv.js 能播的完整 HTTP-FLV 地址。
 * recommendLiveList 返回的是裸 host（rtmp://...），带 stream/secret/time 等分片字段，
 * 需要按 CDN 约定拼成可播地址。旧 CMS 接口直接给拼好的 play_url，走不到这里。
 */
function buildFlvUrl(playInfo?: RawLiveListItem['play_info']): string {
  if (!playInfo?.host) {
    return '';
  }
  const host = playInfo.host.replace(/^rtmps?:\/\//, 'https://').replace(/\/+$/, '');
  if (!playInfo.stream) {
    // 只有 host 没有 stream，兜底直接返回 host（flv.js 播不了但不崩）
    return host;
  }
  // type=3 看起来是 FLV 流，type=4 可能是 HLS。按 type 选扩展名
  const ext = playInfo.type === 4 ? 'm3u8' : 'flv';
  const params: string[] = [];
  if (playInfo.secret) {
    params.push(`txSecret=${encodeURIComponent(playInfo.secret)}`);
  }
  if (playInfo.time) {
    params.push(`txTime=${encodeURIComponent(playInfo.time)}`);
  }
  // 路径：host/live/stream.ext?签名参数
  // live_name 字段在样例里是 "live"，和路径段同名，直接忽略
  const qs = params.length ? `?${params.join('&')}` : '';
  return `${host}/live/${playInfo.stream}.${ext}${qs}`;
}

export function normalize(item: RawLiveListItem, isTop = false): NikoLiveListItem | null {
  const liveIndexId = String(item.live_index_id ?? '');
  const roomId = String(item.room_id ?? item.chat_room_id ?? item.im_group_id ?? item.group_id ?? '');
  if (!liveIndexId) {
    return null;
  }
  // CMS 接口把观众列表放在 live_info.audience_list，兼容顶层写法
  const audience: RawAudienceItem[] = Array.isArray(item.live_info?.audience_list)
    ? item.live_info!.audience_list!
    : Array.isArray(item.audience_list)
      ? item.audience_list!
      : [];
  // 画面方向：live_info.width/height，宽大于高为横屏
  const width = Number(item.live_info?.width) || 0;
  const height = Number(item.live_info?.height) || 0;
  const orientation = width > 0 && height > 0 ? (width > height ? 'landscape' : 'portrait') : '';
  // 在线观众头像叠层：只取 is_online 的观众，最多 3 个
  const audienceAvatars = audience
    .filter((a) => !!a && Number(a.is_online) === 1 && !!a.avatar)
    .slice(0, 3)
    .map((a) => String(a.avatar));
  return {
    liveIndexId,
    roomId,
    anchorUserId: String(item.anchor_id ?? ''),
    anchorShowId: String(item.user_show_id ?? ''),
    nickname: item.nickname ?? '',
    title: item.live_title ?? '',
    // CMS 列表接口不返回封面，列表页会退化为占位图
    cover: item.live_cover ?? item.frontcover ?? '',
    avatar: item.avatar ?? '',
    isCharge: Number(item.is_charge) === 1 ? 1 : 0,
    pkStatus: typeof item.pk_status === 'number' ? item.pk_status : 0,
    viewerCount: audience.length,
    gender: typeof item.gender === 'number' ? item.gender : 0,
    orientation: orientation as '' | 'landscape' | 'portrait',
    audienceAvatars,
    // 组织/公会信息：字段命名不固定，逐个兜底
    organizationName: String(
      item.organization_info?.organization_name
      ?? item.organization_info?.name
      ?? item.organization_info?.org_name
      ?? '',
    ),
    // 优先用旧 CMS 接口给的 play_url（已拼好签名）；
    // 没有时用 recommendLiveList 的 play_info 组装 HTTP-FLV 地址
    playUrl: item.play_url ?? buildFlvUrl(item.play_info),
    isTop,
  };
}

interface ListResponse {
  list?: RawLiveListItem[];
  data?: RawLiveListItem[];
  items?: RawLiveListItem[];
  records?: RawLiveListItem[];
  /** recommendLiveList 业务接口的置顶主播（单个对象） */
  top_anchor_live_info?: {
    is_current_top?: boolean;
    anchor_info?: RawLiveListItem;
  };
  /** recommendLiveList 的推荐列表 */
  recommend_anchor_live_list?: RawLiveListItem[];
  /** recommendLiveList 主列表 */
  anchor_live_list?: RawLiveListItem[];
  total_data?: number;
  total?: number;
  count?: number;
}

export function toList(data: unknown): { list: NikoLiveListItem[]; total: number } {
  const payload = (data ?? {}) as ListResponse;
  if (Array.isArray(payload)) {
    const list = payload.map((item) => normalize(item)).filter((item): item is NikoLiveListItem => !!item);
    return { list, total: list.length };
  }

  // 三个来源合并：置顶 → 推荐 → 主列表，按 liveIndexId 去重
  // 用 { item, isTop } 追踪每个来源，保证置顶标记正确传递
  const seen = new Set<string>();
  const merged: { item: RawLiveListItem; isTop: boolean }[] = [];
  const push = (item: RawLiveListItem | null | undefined, isTop = false) => {
    const id = String(item?.live_index_id ?? '');
    if (item && id && !seen.has(id)) {
      seen.add(id);
      merged.push({ item, isTop });
    }
  };
  // 置顶主播（anchor_info 里嵌在 top_anchor_live_info 下）
  push(payload.top_anchor_live_info?.anchor_info, true);
  // 推荐列表
  for (const item of payload.recommend_anchor_live_list ?? []) {
    push(item, false);
  }
  // 主列表
  for (const item of payload.anchor_live_list ?? []) {
    push(item, false);
  }
  // CMS 旧接口兜底
  if (merged.length === 0) {
    for (const item of payload.list ?? payload.data ?? payload.items ?? payload.records ?? []) {
      push(item, false);
    }
  }

  const list = merged
    .map(({ item, isTop }) => normalize(item, isTop))
    .filter((item): item is NikoLiveListItem => !!item);
  return { list, total: payload.total_data ?? payload.total ?? payload.count ?? list.length };
}

interface LiveMonitorResult {
  list: NikoLiveListItem[];
  total: number;
}

// 页面在路由切换过程中可能被重复挂载，这里做请求去重：
// 同一个请求进行中时复用同一个 Promise，已有成功结果时后续调用直接复用，
// 保证登录后进入主播列表只发出一次 liveMonitorList 请求。
// 只有点击刷新按钮（force=true）才会重新请求。
let pendingRequest: Promise<LiveMonitorResult> | null = null;
let cachedResult: LiveMonitorResult | null = null;

/** 在播主播列表（分页参数为 page / pageSize，与 H5 项目一致） */
export async function fetchLiveMonitorList(
  page = 1,
  pageSize = 20,
  options: { force?: boolean } = {},
): Promise<LiveMonitorResult> {
  if (!options.force) {
    if (pendingRequest) {
      return pendingRequest;
    }
    if (cachedResult) {
      return cachedResult;
    }
  }

  console.log('[CmsLiveList] POST /live/liveMonitorList', { page, pageSize, force: !!options.force });
  const task = cmsRequest
    .post('/live/liveMonitorList', { page, pageSize })
    .then((data) => toList(data));
  pendingRequest = task;
  try {
    const result = await task;
    cachedResult = result;
    return result;
  } finally {
    if (pendingRequest === task) {
      pendingRequest = null;
    }
  }
}

// 默认列表接口已移除 liveFocusMonitorList，仅保留 liveMonitorList
// 关注主播列表后续如有需要另行接入业务域接口

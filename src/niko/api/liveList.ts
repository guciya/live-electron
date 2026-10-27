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
export function normalize(item: RawLiveListItem): NikoLiveListItem | null {
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
    playUrl: item.play_url ?? '',
  };
}

interface ListResponse {
  list?: RawLiveListItem[];
  data?: RawLiveListItem[];
  items?: RawLiveListItem[];
  records?: RawLiveListItem[];
  total_data?: number;
  total?: number;
  count?: number;
}

export function toList(data: unknown): { list: NikoLiveListItem[]; total: number } {
  const payload = (data ?? {}) as ListResponse;
  const raw = Array.isArray(payload)
    ? payload
    : payload.list ?? payload.data ?? payload.items ?? payload.records ?? [];
  const list = (Array.isArray(raw) ? raw : [])
    .map(normalize)
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

// 关注主播列表同样做请求去重（与 liveMonitorList 相同的策略）
let focusPending: Promise<LiveMonitorResult> | null = null;
let focusCached: LiveMonitorResult | null = null;

/**
 * 关注主播列表（/live/liveFocusMonitorList）。
 * 与 H5 的 fetchFocusLiveList 一致：分页参数为 page / page_size。
 */
export async function fetchLiveFocusMonitorList(
  page = 1,
  pageSize = 20,
  options: { force?: boolean } = {},
): Promise<LiveMonitorResult> {
  if (!options.force) {
    if (focusPending) {
      return focusPending;
    }
    if (focusCached) {
      return focusCached;
    }
  }

  console.log('[CmsLiveList] POST /live/liveFocusMonitorList', { page, pageSize, force: !!options.force });
  const task = cmsRequest
    .post('/live/liveFocusMonitorList', { page, page_size: pageSize })
    .then((data) => toList(data));
  focusPending = task;
  try {
    const result = await task;
    focusCached = result;
    return result;
  } finally {
    if (focusPending === task) {
      focusPending = null;
    }
  }
}

import { request } from '../request';

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
  content: string;
  replyUserId?: string;
}): Promise<void> {
  return request.post('/live/liveMessage', params) as unknown as Promise<void>;
}

import { request } from '../request';

export interface NikoLoginResult {
  token: string;
  user_id: string;
  nickname: string;
  /** 登录接口下发的 sign，TRTC 与 IM 的 UserSig 共用 */
  sign: string;
  avatar: string;
  user_show_id: string;
  fans_count: number;
  /** 后端可能下发 TRTC 专用签名（部分环境与 sign 不同） */
  rtc_sign?: string;
  trtc_sign?: string;
  /** 后端可能下发的 SDKAppID，优先使用后端值 */
  sdk_app_id?: number;
  trtc_sdk_app_id?: number;
  sdkAppId?: number;
  is_new_user?: number;
  refresh_token?: string;
}

/** 发送短信验证码（不再需要极验，直接传手机号） */
export function sendVerifyCode(params: { mobile: string }): Promise<void> {
  return request.post('/api/sms/loginVerifyCode', {
    mobile: params.mobile,
  }) as unknown as Promise<void>;
}

/** 手机号 + 验证码登录（platform 写死 h5） */
export function codeLogin(mobile: string, verifyCode: string): Promise<NikoLoginResult> {
  return request.post('/api/account/h5VerifyCodeLogin', {
    mobile,
    verifyCode,
    platform: 'h5',
  }) as unknown as Promise<NikoLoginResult>;
}

export interface AttentionResult {
  result: boolean;
}

export interface NikoOrganizationInfo {
  id: number;
  show_id: string;
  name: string;
  /** 公会/家族模式 */
  organization_mode: number;
  is_creator: boolean;
  [key: string]: any;
}

export interface NikoUserLevelInfo {
  level_id: number;
  level_name: string;
  experience: number;
  level_color?: string;
  level_icon?: string;
  level_gif_icon?: string;
  level_card_icon?: string;
  /** 用户卡片的等级背景图（整张卡片的装饰） */
  level_card_bg?: string;
  join_effects_id?: number;
  level_experience?: number;
  [key: string]: any;
}

/** 用户个人信息 /api/user/personalInfo */
export interface NikoPersonalInfo {
  user_id: number;
  user_show_id: number;
  mobile: string;
  nickname: string;
  avatar: string;
  age: number;
  gender: number;
  introduction: string;
  user_level_info: NikoUserLevelInfo | null;
  follow_count: number;
  fans_count: number;
  friend_count: number;
  dynamic_count: number;
  frame: any;
  /** 是否主播：true 才展示开播入口 */
  is_anchor: boolean;
  is_set_password: boolean;
  is_real_auth: boolean;
  anchor_info: any;
  /** 已加入的公会/家族信息，公会|家族页需要其中的 id */
  organization_info: NikoOrganizationInfo | null;
  coin: number;
  heart_coin: number;
  is_allow_send_message: boolean;
  withdraw_tax_ratio: string;
  user_control_info?: {
    is_mini_player?: boolean;
    is_background_mute?: boolean;
    recharge_limit?: number;
  };
  bind_third_info?: Record<string, boolean>;
  [key: string]: any;
}

/** 获取当前登录用户个人信息（登录成功后调用） */
export function getUserPersonalInfo(): Promise<NikoPersonalInfo> {
  return request.post('/api/user/personalInfo', {}) as unknown as Promise<NikoPersonalInfo>;
}

/** 关注 / 取消关注用户：attentionStatus 1=关注 0=取消关注 */
export function attentionUser(params: {
  attentionUserId: number;
  attentionStatus: number;
}): Promise<AttentionResult> {
  return request.post('/api/relation/userAttention', {
    attentionUserId: params.attentionUserId,
    attentionStatus: params.attentionStatus,
  }) as unknown as Promise<AttentionResult>;
}

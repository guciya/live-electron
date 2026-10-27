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

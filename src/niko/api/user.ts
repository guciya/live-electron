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
}

/** 极验验证参数（发送短信验证码必传） */
export interface GeetestParams {
  logNumber: string;
  captchaOutput: string;
  passToken: string;
  genTime: string;
}

/** 发送短信验证码（需先通过极验图形验证码） */
export function sendVerifyCode(params: { mobile: string } & GeetestParams): Promise<void> {
  return request.post('/api/sms/anchorWebLoginVerifyCode', {
    mobile: params.mobile,
    logNumber: params.logNumber,
    captchaOutput: params.captchaOutput,
    passToken: params.passToken,
    genTime: params.genTime,
  }) as unknown as Promise<void>;
}

/** 手机号 + 验证码登录 */
export function codeLogin(mobile: string, verifyCode: string): Promise<NikoLoginResult> {
  return request.post('/api/account/anchorWebVerifyCodeLogin', {
    mobile,
    verifyCode,
  }) as unknown as Promise<NikoLoginResult>;
}

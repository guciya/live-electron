import { request } from '../request';

/** 支付宝 WAP 支付响应（后端返回 form 字段，可能是 URL 或 HTML form 字符串） */
export interface AliPayResult {
  /** 支付宝支付表单：URL 直接跳转 / HTML form 插入提交 */
  form: string;
  /** 后端返回的支付订单号（如有） */
  out_trade_no?: string;
  [key: string]: unknown;
}

/** 微信 WAP 支付响应（Electron 端没有 WeixinJSBridge，返回参数可用于外部浏览器支付） */
export interface WechatPayResult {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  prepayId: string;
  signType: string;
  paySign: string;
  out_trade_no?: string;
  [key: string]: unknown;
}

/**
 * 支付宝 WAP 支付（对齐 h5-wpp 的 /api/pay/aliWapPay）
 * @param amount 充值金额（元）
 */
export function createAliPayOrder(amount: number | string): Promise<AliPayResult> {
  return request.post('/api/pay/aliWapPay', {
    amount: String(amount),
  });
}

/**
 * 微信 WAP 支付（对齐 h5-wpp 的 /api/pay/wechatWapPay）
 * Electron 端没有 openId（微信环境），此接口需要 openId 时会失败。
 * 仅保留接口定义，实际桌面端建议使用支付宝或引导用户扫码。
 */
export function createWechatPayOrder(amount: number | string, openId?: string): Promise<WechatPayResult> {
  return request.post('/api/pay/wechatWapPay', {
    amount: String(amount),
    openId: openId || '',
  });
}

// NikoLive 后端对接配置（vue-cli 环境变量通过 process.env.VUE_APP_XXX 读取）
// 内置默认值与 web-obs-live 项目的测试环境一致，避免 .env 未加载时请求打到 localhost 出现 404

function readEnv(key: string, fallback = ''): string {
  const val = (process.env as Record<string, string | undefined>)[key];
  return val ?? fallback;
}

export const NIKO_CONFIG = {
  // 直播业务接口域名（主播开播/关播/观众列表）
  apiBaseUrl: readEnv('VUE_APP_API_BASE_URL', 'https://test-live.nikolive.cn'),
  // 用户认证接口域名（/api 前缀走此域：登录、发短信验证码）
  authBaseUrl: readEnv('VUE_APP_API_AUTH_URL', 'https://test-api.nikolive.cn'),
  // 图片资源域名（头像、封面）
  imageDomain: readEnv('VUE_APP_IMAGE_DOMAIN', 'https://test-image.nikolive.cn'),
  // CMS 主播监控列表域名（独立固定 token 鉴权，仅 liveList.ts 使用）
  cmsBaseUrl: readEnv('VUE_APP_CMS_BASE_URL', 'https://test-cms.nikolive.cn'),
  // CMS 主播监控列表鉴权 token（测试/正式环境各自独立）
  cmsAuthToken: readEnv('VUE_APP_CMS_AUTH_TOKEN', 'ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBZWFFpT2pFM09UTXdNRGs1TVRNc0ltVjRjQ0k2TVRjNU16WXhORGN4TXl3aWJXRnVZV2RsY2w5cFpDSTZNVEI5Lkh0Nktob2dFTjVSYmszQkxrZzZScElSZkhaOEN4Q2dBc0p6Y0NmcWdKODg='),
  // H5 业务页域名（家族入驻/公会入驻/公会|家族/提现等软件内部跳转页面）
  // 默认测试域，正式包由 .env.production 覆盖为 h5.nikolive.cn
  h5WebBase: readEnv('VUE_APP_H5_WEB_BASE', 'https://test-h5.nikolive.cn'),
  // 充值中心（二维码弹窗扫这个）
  rechargeCenterUrl: readEnv(
    'VUE_APP_RECHARGE_URL',
    'https://test-h5.nikolive.cn/wpp/',
  ),
  // 主播认证中心（二维码弹窗扫这个）
  anchorAuthUrl: readEnv(
    'VUE_APP_ANCHOR_AUTH_URL',
    'https://test-h5.nikolive.cn/anchorAuthCenter/#/login',
  ),
  // TRTC 与 IM 共用的 SDKAppID，必须与登录接口下发的 sign 所属应用一致
  sdkAppId: Number(readEnv('VUE_APP_TRTC_SDK_APPID', '1600084758')) || 1600084758,
};

/** 补全图片资源地址（后端可能返回相对路径） */
export function resolveImageUrl(path?: string): string {
  if (!path) {
    return '';
  }
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) {
    return path;
  }
  return `${NIKO_CONFIG.imageDomain}/${path.replace(/^\//, '')}`;
}

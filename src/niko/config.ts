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

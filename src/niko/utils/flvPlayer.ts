import flvjs from 'flv.js';

type FlvjsPlayer = ReturnType<typeof flvjs.createPlayer>;

/**
 * 直播流播放器封装（Electron 渲染进程使用）。
 *
 * NikoLive 主播推 TRTC 到云端后由云端转码输出 HTTP-FLV 到 CDN，
 * play_url 是 .flv 地址，Chromium 不原生支持 FLV，必须用 flv.js 走 MSE 播放。
 * 与 H5 项目 niko/flvPlayer.ts 的方案保持一致。
 */

export function isFlvSupported(): boolean {
  return flvjs.isSupported();
}

/** 把后端可能返回的 rtmp 地址转成 http-flv */
function rtmpToFlv(rtmpUrl: string): string {
  return rtmpUrl.replace(/^rtmps?:\/\//, 'https://').replace(/\/live\/(.+)$/, '/live/$1.flv');
}

/** 页面是 https 时把 http 播放地址升级为 https，避免 Mixed Content 拦截 */
function upgradeToHttps(url: string): string {
  return url.startsWith('http://') ? url.replace(/^http:\/\//, 'https://') : url;
}

export interface StreamPlayerOptions {
  /** 静音播放：列表预览必须静音，播放页可传 false */
  muted?: boolean;
  /** 拉流失败回调 */
  onError?: (detail: string) => void;
}

export interface StreamPlayerHandle {
  destroy: () => void;
}

export async function createStreamPlayer(
  videoEl: HTMLVideoElement,
  rawUrl: string,
  options: StreamPlayerOptions = {},
): Promise<StreamPlayerHandle> {
  const { muted = false, onError } = options;

  let player: FlvjsPlayer | null = null;
  let destroyed = false;

  const destroy = () => {
    destroyed = true;
    if (player) {
      try {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      } catch (error) {
        console.warn('[niko/flvPlayer] destroy failed:', error);
      }
      player = null;
    }
    if (!videoEl.src) {
      return;
    }
    try {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
    } catch (error) {
      console.warn('[niko/flvPlayer] reset video element failed:', error);
    }
  };

  if (!rawUrl) {
    return { destroy };
  }

  // 重试场景：先清掉上一次的 src，否则设置相同 URL 不会触发重新加载
  if (videoEl.src) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }

  let url = rawUrl;
  if (url.startsWith('rtmp://') || url.startsWith('rtmps://')) {
    url = rtmpToFlv(url);
  }
  url = upgradeToHttps(url);

  if (url.toLowerCase().includes('.flv') && flvjs.isSupported()) {
    player = flvjs.createPlayer(
      { type: 'flv', url, isLive: true },
      {
        enableWorker: false,
        enableStashBuffer: false,
        stashInitialSize: 128,
      },
    );
    player.on(flvjs.Events.ERROR, (_type: number, _detail: string, info: unknown) => {
      if (destroyed) {
        return;
      }
      const reason = typeof info === 'string'
        ? info
        : ((info as { msg?: string })?.msg ?? JSON.stringify(info ?? ''));
      onError?.(reason);
    });
    player.attachMediaElement(videoEl);
    await player.load();
    videoEl.muted = muted;
    try {
      await videoEl.play();
    } catch {
      videoEl.muted = true;
      await videoEl.play().catch(() => undefined);
    }
    return { destroy };
  }

  // 非 flv 或环境不支持 MSE 时退化为原生播放
  videoEl.src = url;
  videoEl.autoplay = true;
  videoEl.muted = muted;
  try {
    await videoEl.play();
  } catch {
    videoEl.muted = true;
    await videoEl.play().catch(() => undefined);
  }
  return { destroy };
}

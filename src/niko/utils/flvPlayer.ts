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
  /** 拉流失败回调，detail 为可读错误描述（如 'network-error' / 'network-timeout'） */
  onError?: (detail: string) => void;
  /** video 元素原生 error 回调（flv.js 未覆盖到的场景） */
  onVideoError?: (error: MediaError | null) => void;
  /** video 元素 stalled 回调（缓冲停滞，超过阈值通常意味着流已断） */
  onStalled?: () => void;
}

export interface StreamPlayerHandle {
  destroy: () => void;
}

export async function createStreamPlayer(
  videoEl: HTMLVideoElement,
  rawUrl: string,
  options: StreamPlayerOptions = {},
): Promise<StreamPlayerHandle> {
  const { muted = false, onError, onVideoError, onStalled } = options;

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

  // 全局 video 元素事件兜底（flv.js ERROR 没覆盖到的场景）
  if (onVideoError) {
    videoEl.addEventListener('error', () => {
      if (destroyed) {
        return;
      }
      onVideoError(videoEl.error);
    });
  }
  if (onStalled) {
    videoEl.addEventListener('stalled', () => {
      if (destroyed) {
        return;
      }
      onStalled();
    });
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
    // flv.js ERROR 事件签名：(type, detail, info)
    // - type: ErrorTypes (NetworkError / MediaError / OtherError)
    // - detail: ErrorDetails ('network-error' / 'network-timeout' / 'mse-flv-format-error' / ...)
    // - info: 额外信息对象（常为 {} 或 undefined）
    player.on(flvjs.Events.ERROR, (type: number, detail: string, info: unknown) => {
      if (destroyed) {
        return;
      }
      // 把 type + detail + info 拼成可读字符串，方便上层做正则匹配
      const typeName = ['network', 'media', 'format', 'others'][type] ?? String(type);
      const infoStr = typeof info === 'string' ? info : JSON.stringify(info ?? '');
      const reason = `[${typeName}] ${detail} ${infoStr}`.trim();
      console.warn('[niko/flvPlayer] ERROR:', reason);
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

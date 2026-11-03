import { ref } from 'vue';

/**
 * 被用户「关闭」但仍保留在摄像头列表里的摄像头（类似 OBS 的显示/隐藏）。
 * 关闭时会把摄像头从混流中移除（释放设备），列表项保留；点击眼睛图标可重新打开。
 */
export interface DisabledCameraConfig {
  deviceId: string;
  deviceName?: string;
  width?: number;
  height?: number;
  mirrorType?: number;
}

const DISABLED_CAMERAS_KEY = 'niko_live_disabled_cameras';

function loadDisabledCameras(): DisabledCameraConfig[] {
  try {
    const raw = window.localStorage.getItem(DISABLED_CAMERAS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.deviceId) : [];
  } catch {
    return [];
  }
}

/** 模块级单例：混流面板与房间页（恢复摄像头时）共享同一份关闭状态 */
export const disabledCameras = ref<DisabledCameraConfig[]>(loadDisabledCameras());

function persist() {
  try {
    window.localStorage.setItem(DISABLED_CAMERAS_KEY, JSON.stringify(disabledCameras.value));
  } catch {}
}

export function isCameraDisabled(deviceId: string): boolean {
  return disabledCameras.value.some((item) => String(item.deviceId) === String(deviceId));
}

export function getDisabledCamera(deviceId: string): DisabledCameraConfig | undefined {
  return disabledCameras.value.find((item) => String(item.deviceId) === String(deviceId));
}

export function markCameraDisabled(config: DisabledCameraConfig) {
  const deviceId = String(config.deviceId);
  disabledCameras.value = [
    ...disabledCameras.value.filter((item) => String(item.deviceId) !== deviceId),
    { ...config, deviceId },
  ];
  persist();
}

export function markCameraEnabled(deviceId: string) {
  const targetId = String(deviceId);
  if (!isCameraDisabled(targetId)) {
    return;
  }
  disabledCameras.value = disabledCameras.value.filter(
    (item) => String(item.deviceId) !== targetId,
  );
  persist();
}

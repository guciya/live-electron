<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import packageConfig from '../package.json';
import { useAppRequestQuit } from './TUILiveKit/hooks/useAppRequestQuit';
import { setStableWindowTitle } from './TUILiveKit/utils/windowTitle';

useAppRequestQuit();

onMounted(() => {
  const appVersion = packageConfig.version.replace('-build', '.');
  void setStableWindowTitle(appVersion);

  // 启动时立即预取电池/WiFi，登录进入后 AnchorList 可直接使用（不等待 IPC 轮询）
  if ((window as any).ipcRenderer?.invoke) {
    Promise.all([
      (window as any).ipcRenderer.invoke('get-battery-info'),
      (window as any).ipcRenderer.invoke('get-network-info'),
    ]).then(([battery, network]) => {
      (window as any).__INITIAL_SYSTEM_STATUS__ = { battery, network, ts: Date.now() };
    }).catch(() => {
      /* 忽略首次失败，AnchorList 自己也会轮询 */
    });
  }
});
</script>

<style lang="scss">
@import "./TUILiveKit/assets/variable.scss";
@import "./TUILiveKit/assets/global.scss";

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: $color-black;
  color: $font-app-color;
}

#app {
  font-family: $font-app-external-family;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}
</style>

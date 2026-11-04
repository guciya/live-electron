<template>
  <div class="basic-setting">
    <div class="item-setting">
      <span class="title">{{ t('Camera') }}</span>
      <TUISelect class="camera-select" :model-value="modelValueCamera" :disabled="cameraSelectDisabled" @change="onCameraChange">
        <TUIOption
          v-for="item in orderedCameraList"
          :key="item.deviceId"
          :value="item.deviceId"
          :label="item.deviceName"
          :disabled="isCameraOptionDisabled(item.deviceId)"
        />
      </TUISelect>
    </div>
  </div>
</template>

<script lang="ts">
// 记录摄像头在本次进程内首次出现的顺序，避免每次打开面板刷新设备列表时顺序跳动
const cameraOrderCache: string[] = [];
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { TUISelect, TUIOption, useUIKit } from '@tencentcloud/uikit-base-component-vue3';

const { t } = useUIKit();

const props = defineProps<{
  cameraList: Array<{ deviceId: string; deviceName: string; [k: string]: unknown }>;
  modelValueCamera: string;
  isCameraOptionDisabled: (deviceId: string) => boolean;
  /** Disable the whole camera dropdown while a camera add/switch is in flight. */
  cameraSelectDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:camera', value: string): void;
}>();

/** 按首次枚举顺序稳定展示，设备列表顺序变化时不再跳动 */
const orderedCameraList = computed(() => {
  props.cameraList.forEach((item) => {
    if (!cameraOrderCache.includes(item.deviceId)) cameraOrderCache.push(item.deviceId);
  });
  return [...props.cameraList].sort(
    (a, b) => cameraOrderCache.indexOf(a.deviceId) - cameraOrderCache.indexOf(b.deviceId),
  );
});

const onCameraChange = (val: string) => emit('update:camera', val);
</script>

<style lang="scss" scoped>
.basic-setting {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: 16px;
  padding-left: 16px;
}

.item-setting {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  & + .item-setting {
    margin-top: 16px;
  }

  .title {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--text-color-secondary);
    margin-right: 16px;
  }
}

.camera-select {
  width: 400px;
}
</style>

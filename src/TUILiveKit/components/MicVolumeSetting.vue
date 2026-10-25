<template>
  <div class="device-setting">
    <AudioIcon
      :size="16"
      :audio-volume="currentMicVolume"
      :is-muted="micMuted"
      @click="switchMicrophoneStatus"
    />
    <TUISlider
      v-model="microphoneVolume"
      class="device-slider"
      :min="0"
      :max="100"
      @change="handleMicrophoneVolumeChange"
      @mouseup="saveMicrophoneVolumeBeforeMute"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { TUISlider } from '@tencentcloud/uikit-base-component-vue3';
import { useDeviceState } from 'tuikit-atomicx-vue3-electron';
import AudioIcon from '../base-component/AudioIcon.vue';

const {
  captureVolume,
  setCaptureVolume,
  muteLocalAudio,
  unmuteLocalAudio,
  currentMicVolume,
} = useDeviceState();

const DEFAULT_VOLUME = 100;
const microphoneVolume = ref(captureVolume.value || DEFAULT_VOLUME);
const microphoneVolumeBeforeMute = ref(DEFAULT_VOLUME);
/**
 * 原生 TRTC 进房不会触发 TUIKit 房间事件，microphoneStatus 永远停留在 Off，
 * 图标一直显示静音、点击也没有反应；这里改为本地状态驱动（开播时已调用 openLocalMicrophone）。
 */
const micMuted = ref(false);

const switchMicrophoneStatus = async () => {
  try {
    if (micMuted.value) {
      await unmuteLocalAudio();
      const volumeToRestore = microphoneVolumeBeforeMute.value || DEFAULT_VOLUME;
      microphoneVolume.value = volumeToRestore;
      await setCaptureVolume(volumeToRestore);
      micMuted.value = false;
    } else {
      microphoneVolumeBeforeMute.value = microphoneVolume.value || DEFAULT_VOLUME;
      await muteLocalAudio();
      await setCaptureVolume(0);
      micMuted.value = true;
    }
  } catch (error) {
    console.warn('[MicVolumeSetting] switch microphone failed:', error);
  }
};

const handleMicrophoneVolumeChange = async (value: number) => {
  if (value !== captureVolume.value) {
    await setCaptureVolume(value);
  }

  if (value === 0 && !micMuted.value) {
    await muteLocalAudio();
    micMuted.value = true;
  }

  if (value > 0 && micMuted.value) {
    await unmuteLocalAudio();
    micMuted.value = false;
  }
};

const saveMicrophoneVolumeBeforeMute = () => {
  if (microphoneVolume.value > 0) {
    microphoneVolumeBeforeMute.value = microphoneVolume.value;
  }
};

watch(captureVolume, (newVal) => {
  microphoneVolume.value = newVal;
});
</script>

<style lang="scss" scoped>
@import '../assets/mac.scss';

.device-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--bg-color-bubble-reciprocal);
  padding: 0 8px;
  border-radius: 6px;
  height: 40px;

  .device-slider {
    flex: 1;
    width: 46px;

    :deep(.slider-thumb) {
      width: 8px;
      height: 8px;
    }

    :deep(.slider-thumb-disabled) {
      border-color: var(--slider-color-empty);
    }
  }
}
</style>

<template>
  <div class="live-scene-panel" :class="{ 'no-material': !hasAnyMaterial }">
    <LiveSceneSelect :displayMode="!hasAnyMaterial ? 'panel' : 'button'" @add-material="selectMaterial" />
    <div class="materials-list">
      <template v-for="material in mediaSourceListStableOrder" :key="getMaterialKey(material)">
        <MaterialItem
          :material="material"
          :is-active="selectedMaterialKey === getMaterialKey(material)"
          :is-menu-visible="visibleMenuKey === getMaterialKey(material)"
          :can-move-up="canMoveUp(material)"
          :can-move-down="canMoveDown(material)"
          :is-moving="movingKey === getMaterialKey(material)"
          @select="handleSelectMaterial"
          @toggle-enabled="handleToggleCameraEnabled"
          @toggle-menu="handleToggleMenu"
          @close-menu="handleCloseMenu"
          @move-up="handleMoveMaterialUp"
          @move-down="handleMoveMaterialDown"
          @camera-setting="updateCameraSetting(material)"
          @local-video-setting="updateLocalVideoSetting(material)"
          @online-video-setting="updateOnlineVideoSetting(material)"
          @rename="updateMaterialName(material)"
        />
      </template>
      <!-- 已关闭的摄像头：保留列表项，点击眼睛图标重新打开 -->
      <template v-for="material in disabledMaterialList" :key="getMaterialKey(material)">
        <MaterialItem
          :material="material"
          :is-active="false"
          :is-disabled="true"
          :is-menu-visible="false"
          :can-move-up="false"
          :can-move-down="false"
          :is-moving="false"
          @toggle-enabled="handleToggleCameraEnabled"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TRTCMediaSourceType, TRTCVideoMirrorType } from '@tencentcloud/tuiroom-engine-electron';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../../base-component/MessageToast';
import { useVideoMixerState, MediaSource } from 'tuikit-atomicx-vue3-electron';
import LiveSceneSelect from './LiveSceneSelect.vue';
import MaterialItem from './MaterialItem.vue';
import {
  disabledCameras,
  getDisabledCamera,
  markCameraDisabled,
  markCameraEnabled,
} from './cameraVisibilityStore';

const { t } = useUIKit();
const {
  addMediaSource,
  removeMediaSource,
  mediaSourceList,
  activeMediaSource,
  updateMediaSource,
} = useVideoMixerState();

const emits = defineEmits([
  'on-add-camera',
  'on-add-screen-share',
  'on-add-local-video',
  'on-add-online-video',
  'on-update-material',
  'on-rename-material',
]);

// 列表按插入顺序渲染（不按 zOrder 排序）：zOrder 只决定混流里谁在最上层渲染，
// 点选不应该让列表视觉上跳动/重新排序。
const mediaSourceListStableOrder = computed(() => mediaSourceList.value);
const mediaSourceListWithZOrderSort = computed(() => [...mediaSourceList.value].sort(
  (item1: MediaSource, item2: MediaSource) => (item2.zOrder || 0) - (item1.zOrder || 0),
));

// 已关闭的摄像头（不在混流里）也渲染成列表项，眼睛图标点击可重新打开
const disabledMaterialList = computed<MediaSource[]>(() => disabledCameras.value.map((camera) => ({
  sourceId: camera.deviceId,
  sourceType: TRTCMediaSourceType.kCamera,
  name: camera.deviceName || t('Camera'),
  width: camera.width || 1280,
  height: camera.height || 720,
  mirrorType: camera.mirrorType,
  zOrder: -1,
} as MediaSource)));

const hasAnyMaterial = computed(
  () => mediaSourceList.value.length > 0 || disabledCameras.value.length > 0,
);

const visibleMenuKey = ref('');
const movingKey = ref('');

const getMaterialKey = (material: MediaSource) => `${material.sourceType}::${material.sourceId}`;

// 面板自己记住当前激活项：蓝色高亮不依赖 SDK 的 isSelected
// （点击预览空白处等场景 SDK 会取消选中，导致鼠标移开后高亮消失）
const selectedMaterialKey = ref('');
watch(
  () => (activeMediaSource.value ? getMaterialKey(activeMediaSource.value) : ''),
  (key) => {
    if (key) {
      selectedMaterialKey.value = key;
    }
  },
  { immediate: true },
);

// 防护 SDK designer 的 document 级 mousedown/mouseup 监听导致的 emitOnSelect(null)：
// 任何在面板/其他非预览容器里的点击都会让 designer 走 L446-448 或 L512-514 emitOnSelect(null)，
// 把 SDK 的 isSelected 全部清掉。一旦 activeMediaSource 被清空且我们有本地记录的选中项，
// 立即恢复选中态。配合 handleSelectMaterial 里的 setTimeout(0) 形成双保险。
watch(activeMediaSource, (newVal) => {
  if (newVal) return;
  if (!selectedMaterialKey.value) return;
  const target = mediaSourceList.value.find(
    item => getMaterialKey(item) === selectedMaterialKey.value,
  );
  if (!target || target.isSelected) return;
  // 放到下一个 tick：避免在 watch 回调里同步 await
  setTimeout(() => {
    updateMediaSource(target, { isSelected: true }).catch(() => {});
  }, 0);
});

const handleSelectMaterial = async (material: MediaSource) => {
  visibleMenuKey.value = '';
  const targetKey = getMaterialKey(material);
  const target = mediaSourceList.value.find(item => getMaterialKey(item) === targetKey);
  if (!target) {
    return;
  }

  // 面板本地高亮，保持选中态（不受 SDK emitOnSelect(null) 影响）
  selectedMaterialKey.value = targetKey;

  if (target.isSelected) {
    return;
  }

  // 所有摄像头默认 rect 都是 (0,0)，叠在一起——谁 zOrder 最高谁可见。
  // 点选要让被选中的摄像头"显示出来"，必须 bump zOrder；但列表显示不按 zOrder 排序，
  // 所以点选后列表视觉稳定，不会自动重排。
  const curMaxZ = mediaSourceList.value.reduce(
    (max: number, m: MediaSource) => Math.max(max, m.zOrder || 0),
    0,
  );

  try {
    await updateMediaSource(target, { isSelected: true, zOrder: curMaxZ + 1 });
  } catch (error) {
    console.warn('[LiveScenePanel] select material failed:', error);
  }

  // SDK designer 注册了 document 级的 mousedown 监听器——任何在面板上的点都会被它检测成
  // "在容器外点击"，进而触发 emitOnSelect(null)，把 SDK 的 isSelected 全部清掉。
  // 这个 emitOnSelect 发生在 mousedown（click 之前）或 mouseup（在容器外），
  // 时机不确定。我们用两层防护：
  //   1) setTimeout(0)：下一个微任务再选一次，吃掉 mousedown 触发的 emitOnSelect(null)；
  //   2) 下方 watch(activeMediaSource, ...)：监听 SDK 清选中，自动恢复本地记录的选中项
  setTimeout(() => {
    updateMediaSource(target, { isSelected: true }).catch(() => {});
  }, 0);
};

const handleToggleCameraEnabled = async (material: MediaSource) => {
  const sourceId = String(material.sourceId);
  const disabled = getDisabledCamera(sourceId);
  if (disabled) {
    // 重新打开：把摄像头重新加入混流（会重新打开设备并自动置顶/选中）
    // 先清掉关闭记录，避免添加过程中列表同时渲染「启用项 + 闭眼项」造成重复闪一下
    markCameraEnabled(sourceId);
    try {
      const width = disabled.width || 1280;
      const height = disabled.height || 720;
      await addMediaSource({
        sourceId: disabled.deviceId,
        sourceType: TRTCMediaSourceType.kCamera,
        name: disabled.deviceName || material.name || t('Camera'),
        width,
        height,
        rect: { left: 0, top: 0, right: width, bottom: height },
        mirrorType: disabled.mirrorType ?? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable,
      } as MediaSource);
    } catch (error) {
      // 打开失败：恢复闭眼项，用户可重试
      markCameraDisabled(disabled);
      console.warn('[LiveScenePanel] enable camera failed:', error);
      showMessage({
        type: MessageToastType.Error,
        message: t('Failed to add camera'),
      });
    }
    return;
  }

  // 关闭：从混流移除以释放摄像头设备，但列表项保留（闭眼状态），随时可再打开
  try {
    await removeMediaSource(material);
    // 关闭的正是当前激活项时清掉本地高亮，避免闭眼项仍显示蓝色选中态
    if (selectedMaterialKey.value === getMaterialKey(material)) {
      selectedMaterialKey.value = '';
    }
    markCameraDisabled({
      deviceId: sourceId,
      deviceName: material.name,
      width: material.width,
      height: material.height,
      mirrorType: material.mirrorType,
    });
  } catch (error) {
    console.warn('[LiveScenePanel] disable camera failed:', error);
    showMessage({
      type: MessageToastType.Error,
      message: t('Failed to remove media source'),
    });
  }
};

const handleToggleMenu = (material: MediaSource) => {
  const key = getMaterialKey(material);
  visibleMenuKey.value = visibleMenuKey.value === key ? '' : key;
};

const handleCloseMenu = () => {
  visibleMenuKey.value = '';
};

const canMoveUp = (material: MediaSource) => {
  const key = getMaterialKey(material);
  const index = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  return index > 0;
};

const canMoveDown = (material: MediaSource) => {
  const key = getMaterialKey(material);
  const index = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  return index >= 0 && index < mediaSourceListWithZOrderSort.value.length - 1;
};

const getMaterialByKey = (key: string) => mediaSourceList.value.find(item => getMaterialKey(item) === key);

const swapMaterialZOrder = async (material: MediaSource, moveDelta: -1 | 1) => {
  const key = getMaterialKey(material);
  if (movingKey.value) {
    return;
  }
  const currentIndex = mediaSourceListWithZOrderSort.value.findIndex(item => getMaterialKey(item) === key);
  if (currentIndex < 0) {
    return;
  }

  const neighborIndex = currentIndex + moveDelta;
  if (neighborIndex < 0 || neighborIndex >= mediaSourceListWithZOrderSort.value.length) {
    return;
  }

  const current = mediaSourceListWithZOrderSort.value[currentIndex];
  const neighbor = mediaSourceListWithZOrderSort.value[neighborIndex];
  const currentOldZOrder = current.zOrder || 0;
  const neighborOldZOrder = neighbor.zOrder || 0;

  movingKey.value = key;
  visibleMenuKey.value = '';

  try {
    await Promise.all([
      updateMediaSource(current, { zOrder: neighborOldZOrder }),
      updateMediaSource(neighbor, { zOrder: currentOldZOrder }),
    ]);
  } catch (error) {
    console.error('swapMaterialZOrder failed:', error);
    try {
      const currentLatest = getMaterialByKey(getMaterialKey(current));
      const neighborLatest = getMaterialByKey(getMaterialKey(neighbor));
      if (currentLatest && neighborLatest) {
        await Promise.all([
          updateMediaSource(currentLatest, { zOrder: currentOldZOrder }),
          updateMediaSource(neighborLatest, { zOrder: neighborOldZOrder }),
        ]);
      }
    } catch (rollbackError) {
      console.error('swapMaterialZOrder rollback failed:', rollbackError);
    }

    showMessage({
      type: MessageToastType.Error,
      message: t('Failed to adjust layer order'),
    });
  } finally {
    movingKey.value = '';
  }
};

const handleMoveMaterialUp = async (material: MediaSource) => {
  await swapMaterialZOrder(material, -1);
};

const handleMoveMaterialDown = async (material: MediaSource) => {
  await swapMaterialZOrder(material, 1);
};

const updateCameraSetting = (material: MediaSource) => {
  emits('on-update-material', material);
};

const updateLocalVideoSetting = (material: MediaSource) => {
  emits('on-update-material', material);
};

const updateOnlineVideoSetting = (material: MediaSource) => {
  emits('on-update-material', material);
};

const updateMaterialName = (material: MediaSource) => {
  // 暂时仅透传事件，后续按重命名实现计划由上层决定是否走 child 窗口
  emits('on-rename-material', material);
};

const selectMaterial = async (type: TRTCMediaSourceType) => {
  switch (type) {
  case TRTCMediaSourceType.kCamera:
    emits('on-add-camera');
    break;
  case TRTCMediaSourceType.kScreen:
    emits('on-add-screen-share');
    break;
  case TRTCMediaSourceType.kImage:
    addImageMaterial();
    break;
  case TRTCMediaSourceType.kVideoFile:
    emits('on-add-local-video');
    break;
  case TRTCMediaSourceType.kOnlineVideo:
    emits('on-add-online-video');
    break;
  default:
    break;
  }
};

function addImageMaterial() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png,.bmp';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      return;
    }

    // In Electron, file object has 'path' property with local file path
    const filePath = (file as any).path;
    if (!filePath) {
      console.warn('Failed to get file path');
      return;
    }

    // Create blob URL to load image and get dimensions
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    image.onload = async () => {
      const imageWidth = image.width;
      const imageHeight = image.height;
      const imageSourceInfo = {
        sourceId: filePath,
        sourceType: TRTCMediaSourceType.kImage,
        name: file.name || t('Image'),
        rect: {
          left: 0,
          top: 0,
          right: imageWidth,
          bottom: imageHeight,
        },
        zOrder: 1,
      };
      try {
        await addMediaSource(imageSourceInfo);
      } catch (error: any) {
        console.error('addImageMaterial error:', error);
        showMessage({
          type: MessageToastType.Error,
          message: t('Failed to add image'),
        });
      }

      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      showMessage({
        type: MessageToastType.Error,
        message: t('Failed to load image'),
      });
    };
  };
  input.click();
}

</script>

<style lang="scss" scoped>
.live-scene-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  height: 100%;

  &.no-material {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  * {
    box-sizing: border-box;
  }
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  width: 100%;
}

.actions-section {
  display: flex;
  gap: 8px;
  border-radius: 6px;
  background: #1a1a1a;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;

  .add-material-btn {
    border: none;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    .add-icon {
      font-size: 14px;
      font-weight: bold;
    }
  }

  .clear-btn {
    color: red;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
}
</style>

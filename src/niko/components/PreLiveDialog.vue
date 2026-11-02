<template>
  <div class="prelive-mask" v-if="visible">
    <div class="prelive-dialog">
      <div class="prelive-header">
        <span class="prelive-title">开播设置</span>
        <button class="prelive-close" @click="handleClose">×</button>
      </div>

      <div class="prelive-body">
        <!-- 直播标题 -->
        <div class="prelive-field">
          <label class="prelive-label">直播标题</label>
          <input
            v-model="form.liveTitle"
            class="prelive-input"
            type="text"
            maxlength="30"
            placeholder="请输入直播标题"
          />
        </div>

        <!-- 直播封面 -->
        <div class="prelive-field">
          <label class="prelive-label">直播封面</label>
          <div class="prelive-cover" @click="triggerFileInput">
            <img v-if="coverPreviewUrl" :src="coverPreviewUrl" class="prelive-cover-img" alt="cover" />
            <div v-else class="prelive-cover-placeholder">
              <span>点击上传封面</span>
              <span class="prelive-cover-tip">建议尺寸 16:9，小于 2M</span>
            </div>
            <div v-if="uploading" class="prelive-cover-loading">上传中...</div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png"
            style="display:none"
            @change="handleFileChange"
          />
        </div>

        <!-- 直播分类（自定义下拉，Windows 原生 <select> option 不支持 padding） -->
        <div class="prelive-field">
          <label class="prelive-label">直播分类</label>
          <div class="prelive-custom-select" :class="{ open: categoryOpen }">
            <div class="prelive-select-trigger" @click="categoryOpen = !categoryOpen">
              <span :class="{ placeholder: !selectedCategoryName }">{{ selectedCategoryName || '请选择分类' }}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4.5L6 7.5L9 4.5"/></svg>
            </div>
            <div v-if="categoryOpen" class="prelive-select-panel" @click.stop>
              <div
                v-for="cat in categories"
                :key="cat.id"
                class="prelive-select-option"
                :class="{ active: form.liveCategoryId === cat.id }"
                @click="selectCategory(cat.id)"
              >{{ cat.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="prelive-footer">
        <button class="prelive-btn prelive-btn-cancel" @click="handleClose">取消</button>
        <button class="prelive-btn prelive-btn-confirm" :disabled="submitting" @click="handleConfirm">
          {{ submitting ? '创建中...' : '开始直播' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { uploadFile } from '../api/upload';
import { getPrepareLiveInfo, createPrepareLive, type LiveCategory, type PrepareLiveResult } from '../api/live';
import { resolveImageUrl } from '../config';
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', v: boolean): void;
  (e: 'confirm', result: PrepareLiveResult & { liveTitle: string; coverUrl: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const categories = ref<LiveCategory[]>([]);
const uploading = ref(false);
const submitting = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const categoryOpen = ref(false);

/** 当前选中分类的名称（显示用） */
const selectedCategoryName = computed(() => {
  if (!form.liveCategoryId) return '';
  return categories.value.find((c) => c.id === form.liveCategoryId)?.name || '';
});

function selectCategory(id: string | number) {
  form.liveCategoryId = id;
  categoryOpen.value = false;
}

const form = reactive({
  liveTitle: '',
  // 传给后端的封面 path（后端 createPrepareLive 用 path）
  liveCoverPath: '',
  // 显示用的完整封面 URL
  liveCoverUrl: '',
  liveCategoryId: '' as string | number,
});

// 封面预览图（带图片域名补全）
const coverPreviewUrl = computed(() => resolveImageUrl(form.liveCoverUrl || form.liveCoverPath));

const handleClose = () => {
  if (submitting.value) return;
  categoryOpen.value = false;
  emit('update:visible', false);
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!/image\/(jpeg|png)/.test(file.type)) {
    showMessage({ type: MessageToastType.Error, message: '仅支持 JPG/PNG 格式' });
    return;
  }
  if (file.size / 1024 / 1024 >= 2) {
    showMessage({ type: MessageToastType.Error, message: '图片大小不能超过 2M' });
    return;
  }
  uploading.value = true;
  uploadFile(file, '8').then((res) => {
    // 后端返回 url（可能完整或相对）和 path（相对路径）
    form.liveCoverUrl = res.url || '';
    form.liveCoverPath = res.path || res.url || '';
    showMessage({ type: MessageToastType.Success, message: '封面上传成功' });
  }).catch((err) => {
    showMessage({ type: MessageToastType.Error, message: err?.message || '封面上传失败' });
  }).finally(() => {
    uploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  });
};

const handleConfirm = async () => {
  if (!form.liveTitle.trim()) {
    showMessage({ type: MessageToastType.Warning, message: '请输入直播标题' });
    return;
  }
  if (!form.liveCategoryId) {
    showMessage({ type: MessageToastType.Warning, message: '请选择直播分类' });
    return;
  }
  submitting.value = true;
  try {
    const result = await createPrepareLive({
      liveTitle: form.liveTitle.trim(),
      liveCover: form.liveCoverPath || form.liveCoverUrl,
      isCharge: false,
      orientation: 'landscape',
      liveCategoryId: form.liveCategoryId,
    });
    emit('confirm', {
      ...result,
      liveTitle: form.liveTitle.trim(),
      coverUrl: coverPreviewUrl.value,
    });
    emit('update:visible', false);
  } catch (err: any) {
    showMessage({ type: MessageToastType.Error, message: err?.message || '预开播失败，请重试' });
  } finally {
    submitting.value = false;
  }
};

// 每次打开「开播设置」都拉取一次预开播信息，回显上一次的标题、封面与分类
const loadPrepareInfo = async () => {
  try {
    const info = await getPrepareLiveInfo();
    if (info?.live_category_list?.length) {
      categories.value = info.live_category_list;
    }
    if (info?.live_title) {
      form.liveTitle = info.live_title;
    }
    if (info?.live_cover) {
      form.liveCoverPath = info.live_cover;
      form.liveCoverUrl = info.live_cover;
    }
    if (info?.live_category_id) {
      form.liveCategoryId = info.live_category_id;
    }
  } catch (e) {
    // 分类/回显加载失败不阻断开播
    console.warn('[Niko] prepareLiveInfo failed:', e);
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadPrepareInfo();
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.prelive-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.prelive-dialog {
  width: 480px;
  background: #101013;
  border: 1px solid #232329;
  border-radius: 12px;
  /* overflow: hidden 会裁掉自定义下拉 panel 的超出部分（滚动条也看不到）。
     dialog 内部没有元素需要被圆角裁剪，改为 visible 让下拉弹出。 */
  overflow: visible;
  color: #fff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.6);
}
.prelive-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #232329;
  .prelive-title { font-size: 16px; font-weight: 600; }
  .prelive-close {
    background: none; border: none; color: rgba(255,255,255,0.45); font-size: 22px; cursor: pointer;
    &:hover { color: #fff; }
  }
}
.prelive-body { padding: 20px; }
.prelive-field { margin-bottom: 16px; }
.prelive-label { display: block; margin-bottom: 8px; font-size: 14px; color: rgba(255,255,255,0.6); }
.prelive-input, .prelive-select {
  width: 100%;
  padding: 8px 12px;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  outline: none;
  &:focus { border-color: #4a90d9; }
}
.prelive-select option { background: #17171b; color: #fff; }
/* 自定义直播分类下拉（替代原生 <select>，解决 Windows Electron option 不认 padding 的问题） */
.prelive-custom-select {
  position: relative;
  width: 100%;
  user-select: none;
}
.prelive-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: border-color .15s;
}
.prelive-select-trigger:hover { border-color: #4a90d9; }
.prelive-custom-select.open .prelive-select-trigger { border-color: #4a90d9; }
.prelive-select-trigger .placeholder { color: rgba(255,255,255,0.35); }
.prelive-select-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 240px;
  overflow-y: auto;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.prelive-select-option {
  padding: 10px 14px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  transition: background-color .12s;
}
.prelive-select-option:hover { background: rgba(74, 144, 217, 0.18); }
.prelive-select-option.active { background: rgba(74, 144, 217, 0.28); color: #a9ccff; }
.prelive-cover {
  width: 100%;
  min-height: 160px;
  background: #17171b;
  border: 1px dashed #26262c;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  &:hover { border-color: #4a90d9; }
}
.prelive-cover-img { width: 100%; height: auto; display: block; background: #000; }
.prelive-cover-placeholder {
  display: flex; flex-direction: column; align-items: center; color: rgba(255,255,255,0.35);
  .prelive-cover-tip { font-size: 12px; margin-top: 4px; }
}
.prelive-cover-loading {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
}
.prelive-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 20px; border-top: 1px solid #232329;
}
.prelive-btn {
  padding: 8px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px;
}
.prelive-btn-cancel { background: #232329; color: rgba(255,255,255,0.7); }
.prelive-btn-confirm {
  background: #4a90d9; color: #fff;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>

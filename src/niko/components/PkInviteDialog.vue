<template>
  <div v-if="visible" class="niko-pk-mask" @click.self="close">
    <div class="niko-pk-dialog">
      <div class="niko-pk-head">
        <span class="niko-pk-title">{{ title }}</span>
        <span class="niko-pk-close" @click="close">×</span>
      </div>

      <div class="niko-pk-search-row">
        <input
          v-model="keyword"
          class="niko-pk-search"
          type="text"
          :placeholder="t('搜索昵称')"
          @keyup.enter="loadAnchors"
        />
        <button class="niko-pk-search-btn" @click="loadAnchors">{{ t('搜索') }}</button>
      </div>

      <div class="niko-pk-list">
        <div v-if="loading" class="niko-pk-tip">{{ t('加载中...') }}</div>
        <div v-else-if="anchors.length === 0" class="niko-pk-tip">{{ t('暂无主播') }}</div>
        <div
          v-for="anchor in anchors"
          :key="String(anchor.user_id ?? anchor.anchor_id)"
          class="niko-pk-row"
          :class="{ 'is-disabled': inviting }"
        >
          <img
            v-if="resolveImageUrl(anchor.avatar || '')"
            class="niko-pk-avatar"
            :src="resolveImageUrl(anchor.avatar || '')"
            alt=""
            @error="onAvatarError"
          />
          <span v-else class="niko-pk-avatar niko-pk-avatar--placeholder">
            {{ (anchor.nickname || 'N').slice(0, 1) }}
          </span>
          <div class="niko-pk-info">
            <div class="niko-pk-name">{{ anchor.nickname || t('未命名') }}</div>
            <div class="niko-pk-id">ID:{{ anchor.user_show_id || anchor.anchor_id || '--' }}</div>
          </div>
          <span v-if="anchor.is_live === 1" class="niko-pk-live">直播中</span>
          <button class="niko-pk-invite" :disabled="inviting" @click="handleInvite(anchor)">
            {{ t('邀请') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { getPkAnchorList, invitePk, type PkAnchorItem } from '../api/live';
import { resolveImageUrl } from '../config';

const props = withDefaults(defineProps<{
  visible: boolean;
  /** 弹窗标题：PK / 连麦 */
  title?: string;
  /** 已在 PK 中时继续拉人需要带上 pkId */
  pkId?: string;
  /** 已在 PK 中的人，用于排除 */
  excludeUserIds?: string[];
}>(), {
  title: '选择连麦主播',
  pkId: '',
  excludeUserIds: () => [],
});

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'invited', anchorId: string): void;
}>();

const { t } = useUIKit();
const anchors = ref<PkAnchorItem[]>([]);
const keyword = ref('');
const loading = ref(false);
const inviting = ref(false);

function close() {
  emit('update:visible', false);
}

function onAvatarError(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none';
}

async function loadAnchors() {
  loading.value = true;
  try {
    const res = await getPkAnchorList(keyword.value.trim());
    const list: PkAnchorItem[] = Array.isArray(res)
      ? res
      : ((res as any)?.list || (res as any)?.data || []);
    const exclude = new Set(props.excludeUserIds.map(String));
    anchors.value = exclude.size
      ? list.filter(item => !exclude.has(String(item.user_id ?? item.anchor_id)))
      : list;
    console.log('[NikoPK] liveAnchorList:', anchors.value.length);
  } catch (error: any) {
    anchors.value = [];
    console.warn('[NikoPK] liveAnchorList failed:', error?.message || error);
  } finally {
    loading.value = false;
  }
}

async function handleInvite(anchor: PkAnchorItem) {
  if (inviting.value) {
    return;
  }
  const anchorId = anchor.user_id ?? anchor.anchor_id;
  if (anchorId == null) {
    return;
  }
  inviting.value = true;
  try {
    await invitePk(anchorId, props.pkId);
    console.log('[NikoPK] invite sent to:', anchorId);
    emit('invited', String(anchorId));
    close();
  } catch (error: any) {
    console.warn('[NikoPK] invite failed:', error?.message || error);
  } finally {
    inviting.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      keyword.value = '';
      void loadAnchors();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.niko-pk-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.niko-pk-dialog {
  width: 460px;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 14px;
  border-radius: 14px;
  background: #1f2027;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.niko-pk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.niko-pk-title {
  font-size: 15px;
  font-weight: 600;
}

.niko-pk-close {
  font-size: 22px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.niko-pk-close:hover {
  color: #fff;
}

.niko-pk-search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.niko-pk-search {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border-radius: 17px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
  outline: none;
}

.niko-pk-search:focus {
  border-color: #2b7fff;
}

.niko-pk-search-btn {
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.niko-pk-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.niko-pk-tip {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.niko-pk-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.niko-pk-row:last-child {
  border-bottom: none;
}

.niko-pk-row.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.niko-pk-avatar {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.12);
}

.niko-pk-avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(43, 127, 255, 0.5), rgba(43, 127, 255, 0.2));
  color: #fff;
  font-size: 14px;
}

.niko-pk-info {
  flex: 1;
  min-width: 0;
}

.niko-pk-name {
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.niko-pk-id {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.niko-pk-live {
  flex: 0 0 auto;
  padding: 1px 8px;
  border-radius: 9px;
  background: rgba(255, 76, 76, 0.16);
  color: #ff7b7b;
  font-size: 11px;
}

.niko-pk-invite {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(90deg, #ff6b6b, #ffa53d);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.niko-pk-invite:hover {
  filter: brightness(1.08);
}
</style>

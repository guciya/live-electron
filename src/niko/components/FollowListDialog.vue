<template>
  <div v-if="visible" class="follow-mask" @click.self="handleClose">
    <div class="follow-panel">
      <div class="follow-panel-header">
        <div class="follow-panel-title">
          <span>关注列表</span>
          <span class="follow-panel-count">{{ list.length }} 位正在直播</span>
        </div>
        <button class="follow-panel-close" type="button" aria-label="关闭" @click="handleClose">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="follow-panel-body">
        <div v-if="loadError" class="follow-state">
          <p>关注列表加载失败：{{ loadError }}</p>
          <button class="follow-retry-btn" type="button" :disabled="loading" @click="loadList">重试</button>
        </div>
        <div v-else-if="loading" class="follow-state">加载中...</div>
        <div v-else-if="!list.length" class="follow-state">
          <p>关注的主播都还没开播</p>
        </div>
        <div v-else class="follow-grid">
          <div
            v-for="item in list"
            :key="item.liveIndexId"
            class="follow-card"
            @click="handleSelect(item)"
          >
            <div class="follow-card-cover">
              <img
                v-if="item.cover"
                class="follow-card-cover-img"
                :src="resolveImageUrl(item.cover)"
                alt=""
              />
              <div v-else class="follow-card-empty">直播中</div>
              <span class="follow-card-enter">进入直播间</span>
            </div>
            <div class="follow-card-info">
              <img
                v-if="item.avatar"
                class="follow-card-avatar"
                :src="resolveImageUrl(item.avatar)"
                alt=""
              />
              <div v-else class="follow-card-avatar follow-card-avatar-empty" />
              <div class="follow-card-text">
                <span class="follow-card-title">{{ item.title || '直播中' }}</span>
                <span class="follow-card-name">{{ item.nickname || '主播' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchAttentionLiveList } from '../api/live';
import type { NikoLiveListItem } from '../api/liveList';
import { resolveImageUrl } from '../config';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', item: NikoLiveListItem): void;
}>();

const list = ref<NikoLiveListItem[]>([]);
const loading = ref(false);
const loadError = ref('');

async function loadList() {
  loading.value = true;
  loadError.value = '';
  try {
    const result = await fetchAttentionLiveList(1, 500);
    list.value = result.list;
  } catch (error) {
    list.value = [];
    loadError.value = error instanceof Error ? error.message : String(error);
    console.error('[FollowListDialog] fetchAttentionLiveList failed:', error);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      list.value = [];
      void loadList();
    }
  },
);

function handleClose() {
  emit('close');
}

function handleSelect(item: NikoLiveListItem) {
  emit('select', item);
}
</script>

<style scoped lang="scss">
.follow-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}

.follow-panel {
  display: flex;
  flex-direction: column;
  width: min(1440px, calc(50vw - 3rem));
  max-width: calc(100vw - 3rem);
  height: 80vh;
  max-height: calc(100vh - 3rem);
  background: #15161c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.follow-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.follow-panel-title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.follow-panel-count {
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.follow-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }
}

.follow-panel-body {
  flex: 1;
  min-height: 0;
  padding: 1rem 1.25rem 1.25rem;
  overflow-y: auto;
}

.follow-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 100%;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
}

.follow-retry-btn {
  padding: 0.375rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: #fff;
  font-size: 0.75rem;
  background: transparent;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.follow-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.875rem;
}

.follow-card {
  width: 190px;
  border-radius: 0.75rem;
  background: #1c1d25;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.45);
  }
}

.follow-card-cover {
  position: relative;
  width: 100%;
  height: 110px;
  overflow: hidden;
  background: #0d0e12;
}

.follow-card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.follow-card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
}

.follow-card-enter {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.625rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}

.follow-card-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem 0.625rem;
}

.follow-card-avatar {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  background: #2a2b33;
}

.follow-card-avatar-empty {
  background: #2a2b33;
}

.follow-card-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.follow-card-title,
.follow-card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.follow-card-title {
  color: #fff;
}

.follow-card-name {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
}
</style>

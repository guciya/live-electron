<template>
  <div v-if="visible" class="follow-mask" @click.self="handleClose">
    <div class="follow-panel">
      <ModalThreeScene variant="follow" />
      <div class="follow-panel-header">
        <div class="follow-panel-title">
          <span>关注列表</span>
          <span class="follow-panel-count">{{ list.length }} 位</span>
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
          <p>暂无关注用户</p>
        </div>
        <div v-else class="follow-grid">
          <div
            v-for="user in list"
            :key="user.user_id"
            class="follow-card"
            @click="handleSelect(user)"
          >
            <img
              v-if="user.avatar"
              class="follow-card-avatar"
              :src="resolveImageUrl(user.avatar)"
              alt=""
            />
            <div v-else class="follow-card-avatar follow-card-avatar-empty" />
            <div class="follow-card-text">
              <div class="follow-card-name-row">
                <span class="follow-card-title">{{ user.nickname || `用户${user.user_show_id}` }}</span>
                <span v-if="user.is_whitelist" class="follow-card-badge">白名单</span>
              </div>
              <div class="follow-card-meta">
                <img
                  v-if="levelIcon(user)"
                  class="follow-card-level-icon"
                  :src="levelIcon(user)"
                  alt=""
                />
                <span v-if="levelName(user)" class="follow-card-level-name">{{ levelName(user) }}</span>
                <span class="follow-card-contribute">贡献 {{ user.contribute || 0 }}</span>
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
import { fetchAnchorPrepareWhitelist, type AnchorPrepareWhitelistUser } from '../api/live';
import { resolveImageUrl } from '../config';
import ModalThreeScene from './ModalThreeScene.vue';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', user: AnchorPrepareWhitelistUser): void;
}>();

const list = ref<AnchorPrepareWhitelistUser[]>([]);
const loading = ref(false);
const loadError = ref('');

async function loadList() {
  loading.value = true;
  loadError.value = '';
  try {
    // 主播预备白名单用户列表：type=2 关注
    list.value = await fetchAnchorPrepareWhitelist({ page: 1, pageSize: 200, type: 2 });
  } catch (error) {
    list.value = [];
    loadError.value = error instanceof Error ? error.message : String(error);
    console.error('[FollowListDialog] fetchAnchorPrepareWhitelist failed:', error);
  } finally {
    loading.value = false;
  }
}

function levelIcon(user: AnchorPrepareWhitelistUser): string {
  const icon = user.user_level_info?.user_level_icon;
  return icon ? resolveImageUrl(icon) : '';
}

function levelName(user: AnchorPrepareWhitelistUser): string {
  return user.user_level_info?.user_level_name || '';
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

function handleSelect(user: AnchorPrepareWhitelistUser) {
  emit('select', user);
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
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: min(1440px, calc(50vw - 3rem));
  max-width: calc(100vw - 3rem);
  height: 80vh;
  max-height: calc(100vh - 3rem);
  background:
    radial-gradient(circle at 76% 40%, rgba(70, 109, 190, 0.13), transparent 42%),
    radial-gradient(circle at 22% 82%, rgba(118, 75, 180, 0.09), transparent 38%),
    linear-gradient(145deg, rgba(20, 23, 34, 0.98), rgba(14, 15, 23, 0.98));
  border: 1px solid rgba(137, 180, 255, 0.13);
  border-radius: 1rem;
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.5), 0 0 3rem rgba(76, 114, 220, 0.06);
  overflow: hidden;
}

.follow-panel > :not(.modal-three-scene) {
  position: relative;
  z-index: 1;
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
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 240px;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  background: #1c1d25;
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.45);
    border-color: rgba(255, 255, 255, 0.14);
  }
}

.follow-card-avatar {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
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
  gap: 0.1875rem;
  min-width: 0;
}

.follow-card-name-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.follow-card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  color: #fff;
}

.follow-card-badge {
  flex: none;
  padding: 0 0.375rem;
  border-radius: 999px;
  font-size: 0.625rem;
  line-height: 1rem;
  color: #ffcf6b;
  background: rgba(255, 207, 107, 0.14);
  border: 1px solid rgba(255, 207, 107, 0.35);
}

.follow-card-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
}

.follow-card-level-icon {
  flex: none;
  width: 1rem;
  height: 1rem;
  object-fit: contain;
}

.follow-card-level-name {
  flex: none;
  color: rgba(255, 207, 107, 0.85);
}

.follow-card-contribute {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

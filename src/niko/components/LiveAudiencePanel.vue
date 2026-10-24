<template>
  <div class="niko-audience" :style="{ height }">
    <div v-if="members.length === 0" class="niko-audience-empty">
      {{ connecting ? t('Loading') + '...' : t('No viewers yet') }}
    </div>
    <div
      v-for="member in members"
      :key="member.userId"
      class="niko-audience-item"
    >
      <img
        v-if="member.avatar"
        class="niko-audience-avatar"
        :src="member.avatar"
        alt=""
      />
      <span v-else class="niko-audience-avatar niko-audience-avatar--placeholder">
        {{ (member.nickname || 'N').slice(0, 1) }}
      </span>
      <span class="niko-audience-name">{{ member.nickname }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { onLiveImMembers, refreshMembers, type LiveImMember } from '../im/liveIm';

withDefaults(defineProps<{ height?: string }>(), { height: '100%' });

const emit = defineEmits<{ (event: 'count-change', count: number): void }>();

const { t } = useUIKit();
const members = ref<LiveImMember[]>([]);
const connecting = ref(true);
let unsubscribe: (() => void) | null = null;
let timer: number | null = null;

onMounted(() => {
  unsubscribe = onLiveImMembers((list) => {
    members.value = list;
    connecting.value = false;
    emit('count-change', list.length);
  });
  // 群成员变化没有可靠事件，定期刷新兜底
  timer = window.setInterval(() => {
    refreshMembers();
  }, 10000);
});

onBeforeUnmount(() => {
  unsubscribe?.();
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
.niko-audience {
  overflow-y: auto;
  padding: 4px 8px;
}

.niko-audience-empty {
  color: var(--uikit-color-text-secondary, #888);
  font-size: 12px;
}

.niko-audience-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}

.niko-audience-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.niko-audience-avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--uikit-color-bg-secondary, rgba(255, 255, 255, 0.12));
  font-size: 12px;
}

.niko-audience-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

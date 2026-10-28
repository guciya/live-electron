<template>
  <div v-if="visible" class="audience-panel" :class="{ 'is-docked': docked }" @click.stop>
    <!-- 标签：在线用户 / 贵族用户 / 贡献 -->
    <div class="audience-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="audience-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="switchTab(tab.key)"
      >{{ tab.label }}</button>
      <span class="audience-help" title="列表说明">?</span>
    </div>

    <div class="audience-body">
      <div v-if="loading" class="audience-tip">加载中...</div>
      <div v-else-if="loadError" class="audience-tip">
        <span>{{ loadError }}</span>
        <button class="audience-retry" type="button" @click="loadData">重试</button>
      </div>
      <template v-else>
        <div
          v-for="(item, index) in rows"
          :key="`${item.userId}-${index}`"
          class="audience-item"
        >
          <span v-if="activeTab === 'contribute'" class="audience-medal">
            {{ medalText(index) }}
          </span>
          <img
            v-if="item.avatar"
            class="audience-item-avatar"
            :src="item.avatar"
            alt=""
          />
          <span v-else class="audience-item-avatar audience-item-initial">
            {{ item.nickname.slice(0, 1).toUpperCase() }}
          </span>
          <div class="audience-item-main">
            <span class="audience-item-name">{{ item.nickname }}</span>
            <div class="audience-item-badges">
              <span v-if="item.gender" class="audience-gender" :class="item.gender === 2 ? 'female' : 'male'">
                {{ item.gender === 2 ? '♀' : '♂' }}
              </span>
              <span v-if="item.age" class="audience-age">{{ item.age }}</span>
              <img v-if="item.levelIcon" class="audience-level" :src="item.levelIcon" :title="item.levelName" alt="" />
            </div>
          </div>
          <span v-if="activeTab === 'contribute'" class="audience-score">
            {{ item.score.toLocaleString() }}<i class="audience-fire">🔥</i>
          </span>
        </div>
        <div v-if="!rows.length" class="audience-tip">{{ emptyText }}</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { resolveImageUrl } from '../config';
import {
  getAudienceList,
  getLiveContributeUserList,
  type ContributeUserItem,
  type LiveAudienceItem,
} from '../api/live';

const props = defineProps<{
  visible: boolean;
  liveIndexId?: number;
  /** 嵌入固定面板（开播页右侧）时铺满父容器，不使用下拉定位 */
  docked?: boolean;
}>();

const emit = defineEmits<{
  (e: 'count-change', count: number): void;
}>();

type TabKey = 'online' | 'noble' | 'contribute';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'online', label: '在线用户' },
  { key: 'noble', label: '贵族用户' },
  { key: 'contribute', label: '贡献' },
];

interface PanelRow {
  userId: number;
  nickname: string;
  avatar: string;
  gender: number;
  age: number;
  levelIcon: string;
  levelName: string;
  score: number;
}

const activeTab = ref<TabKey>('online');
const rows = ref<PanelRow[]>([]);
const loading = ref(false);
const loadError = ref('');

const emptyText = computed(() => {
  if (activeTab.value === 'online') return '暂无在线用户';
  if (activeTab.value === 'noble') return '暂无贵族用户';
  return '暂无贡献数据';
});

function normalizeAudience(item: LiveAudienceItem): PanelRow {
  const level = item.user_level_info;
  return {
    userId: item.user_id,
    nickname: item.nickname || '用户',
    avatar: item.avatar ? resolveImageUrl(item.avatar) : '',
    gender: item.gender || 0,
    age: item.age || 0,
    levelIcon: level?.level_icon ? resolveImageUrl(level.level_icon) : '',
    levelName: level?.level_name || '',
    score: item.contribute_popularity || 0,
  };
}

function normalizeContribute(item: ContributeUserItem): PanelRow {
  const level = item.user_level_info;
  return {
    userId: item.user_id,
    nickname: item.nickname || '用户',
    avatar: item.avatar ? resolveImageUrl(item.avatar) : '',
    gender: item.gender || 0,
    age: item.age || 0,
    levelIcon: level?.user_level_icon ? resolveImageUrl(level.user_level_icon) : '',
    levelName: level?.user_level_name || '',
    score: item.contribute || 0,
  };
}

/** 贡献前三名展示金银铜牌 */
function medalText(index: number): string {
  return ['🥇', '🥈', '🥉'][index] || '';
}

let requestSeq = 0;
let pollTimer: number | null = null;

/** silent：静默刷新（开播页轮询），不展示 loading、失败时保留旧数据 */
async function loadData(silent = false) {
  const liveIndexId = props.liveIndexId;
  if (!liveIndexId) {
    rows.value = [];
    return;
  }
  const seq = ++requestSeq;
  if (!silent) {
    loading.value = true;
    loadError.value = '';
  }
  try {
    if (activeTab.value === 'contribute') {
      const list = await getLiveContributeUserList({ liveIndexId });
      if (seq !== requestSeq) return;
      rows.value = (list || []).map(normalizeContribute);
    } else {
      const result = await getAudienceList({
        liveIndexId,
        audiencesType: activeTab.value === 'noble' ? 2 : 1,
      });
      if (seq !== requestSeq) return;
      const nextRows = (result?.audience_list || []).map(normalizeAudience);
      if (!silent || nextRows.length > 0) {
        rows.value = nextRows;
      }
      // 在线用户的总数同步给外层标题（开播页「在线观众 (N)」）
      if (activeTab.value === 'online') {
        emit('count-change', Number(result?.audience_count) || 0);
      }
    }
  } catch (error) {
    if (seq !== requestSeq) return;
    if (!silent) {
      rows.value = [];
      loadError.value = error instanceof Error ? error.message : '加载失败';
    }
    console.warn('[AudiencePanel] load failed:', error);
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
    }
  }
}

function switchTab(key: TabKey) {
  if (activeTab.value === key) return;
  activeTab.value = key;
  loadData();
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadData();
    }
  },
);

watch(
  () => props.liveIndexId,
  () => {
    if (props.visible) {
      loadData();
    }
  },
);

onMounted(() => {
  if (!props.visible) return;
  loadData();
  // 嵌入开播页常驻展示：定时静默刷新在线人数，保持标题计数准确
  if (props.docked) {
    pollTimer = window.setInterval(() => {
      if (activeTab.value === 'contribute' || loading.value) return;
      void loadData(true);
    }, 15000);
  }
});

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<style lang="scss" scoped>
.audience-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 19rem;
  max-height: 24rem;
  overflow: hidden;
  background-color: rgba(20, 21, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);

  /* 嵌入开播页右侧面板：铺满父容器，去掉弹层的外观 */
  &.is-docked {
    position: static;
    width: 100%;
    height: calc(100% - 36px);
    max-height: none;
    background: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: none;

    .audience-tabs {
      padding-right: 0;
      padding-left: 0;
    }
  }
}

.audience-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.audience-tab {
  position: relative;
  padding: 0.375rem 0.5rem 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.15s ease;

  &.active {
    color: #fff;
    font-weight: 600;

    &::after {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 1.125rem;
      height: 0.125rem;
      content: '';
      background-color: #ff3d71;
      border-radius: 1px;
      transform: translateX(-50%);
    }
  }
}

.audience-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  margin-bottom: 0.375rem;
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.audience-body {
  flex: 1;
  min-height: 0;
  padding: 0.25rem 0 0.375rem;
  overflow-y: auto;
}

.audience-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
}

.audience-medal {
  flex: none;
  width: 1.125rem;
  font-size: 0.875rem;
  text-align: center;
}

.audience-item-avatar {
  flex: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
  background-color: rgba(255, 255, 255, 0.12);
}

.audience-item-initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.audience-item-main {
  flex: 1;
  min-width: 0;
}

.audience-item-name {
  display: block;
  overflow: hidden;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audience-item-badges {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.audience-gender {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  font-size: 0.5625rem;
  color: #fff;
  border-radius: 50%;

  &.male {
    background-color: #3e8ef7;
  }

  &.female {
    background-color: #ff6f9c;
  }
}

.audience-age {
  font-size: 0.5625rem;
  color: rgba(255, 255, 255, 0.55);
}

.audience-level {
  height: 0.875rem;
  object-fit: contain;
}

.audience-score {
  flex: none;
  font-size: 0.6875rem;
  color: #ffd873;
}

.audience-fire {
  margin-left: 0.125rem;
  font-style: normal;
}

.audience-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 0.75rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

.audience-retry {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  color: #fff;
  cursor: pointer;
  background-color: rgba(255, 61, 113, 0.85);
  border: none;
  border-radius: 0.625rem;
}
</style>

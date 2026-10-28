<template>
  <div v-if="visible" class="rank-mask" @click="emit('close')">
    <div class="rank-panel" @click.stop>
      <!-- 头部：奖杯 + 人气榜标识 -->
      <div class="rank-head">
        <div class="rank-head-logo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.5A6.5 6.5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A6.5 6.5 0 0 1 7.5 12H7a4 4 0 0 1-4-4V5h3V3zm0 4H5v1a2 2 0 0 0 1.2 1.8A6.6 6.6 0 0 1 6 7zm12 0a6.6 6.6 0 0 1-.2 1.8A2 2 0 0 0 19 7V7h-1z" />
          </svg>
          <span>人气榜</span>
        </div>
        <div class="rank-head-tools">
          <span class="rank-help" title="榜单规则说明">?</span>
          <button class="rank-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
        </div>
      </div>

      <!-- 榜单切换 -->
      <div class="rank-tabs">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          class="rank-tab"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- 抢热推：倒计时 + 当前热推主播 -->
      <div v-if="activeTab === 'rush'" class="rank-rush">
        <div class="rank-rush-timer">
          <span>本轮抢热推倒计时 {{ rushCountdownText }}</span>
          <span class="rank-rush-refresh" title="刷新" @click.stop="loadRank">↻</span>
        </div>
        <div class="rank-rush-anchor">
          <div class="rank-rush-avatar-wrap">
            <img v-if="anchorAvatar" class="rank-rush-avatar" :src="anchorAvatar" alt="" />
            <span v-else class="rank-rush-avatar rank-rush-avatar-empty">{{ anchorInitial }}</span>
          </div>
          <span class="rank-rush-name">{{ anchorName || '主播' }}</span>
          <span class="rank-rush-tag">当前热推主播</span>
        </div>
      </div>

      <!-- 加载 / 错误 -->
      <div v-if="loading" class="rank-tip">加载中...</div>
      <div v-else-if="loadError" class="rank-tip">
        <span>{{ loadError }}</span>
        <button class="rank-retry" type="button" @click="loadRank">重试</button>
      </div>

      <!-- 前三名领奖台（抢热推不设领奖台，直接列表展示） -->
      <div v-else-if="activeTab !== 'rush'" class="rank-podium">
        <div
          v-for="slot in podium"
          :key="slot.rank"
          class="rank-podium-item"
          :class="`rank-podium-item-${slot.rank}`"
        >
          <div class="rank-podium-avatar">
            <img v-if="slot.avatar" class="rank-podium-avatar-img" :src="slot.avatar" alt="" />
            <span v-else class="rank-podium-avatar-empty" />
          </div>
          <div class="rank-podium-pillar">
            <span class="rank-podium-name">{{ slot.name }}</span>
            <span v-if="slot.score" class="rank-podium-score">{{ slot.score }}</span>
            <span class="rank-podium-number">{{ slot.rank }}</span>
          </div>
        </div>
      </div>

      <!-- 名次列表 -->
      <div class="rank-list" v-if="!loading && !loadError">
        <div v-for="row in listRows" :key="row.rank" class="rank-row">
          <span class="rank-row-index">{{ row.rank }}</span>
          <div class="rank-row-body">
            <div class="rank-row-avatar">
              <img v-if="row.avatar" class="rank-row-avatar-img" :src="row.avatar" alt="" />
              <span v-else class="rank-row-avatar-empty" />
            </div>
            <span class="rank-row-name">{{ row.name }}</span>
            <span class="rank-row-score">
              <span class="rank-row-fire">🔥</span>{{ row.score }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部：我的排名 + 为Ta助力 -->
      <div class="rank-footer">
        <span class="rank-footer-badge">{{ myRankText }}</span>
        <img v-if="myAvatar" class="rank-footer-avatar" :src="myAvatar" alt="" />
        <span v-else class="rank-footer-avatar rank-footer-avatar-empty">{{ myInitial }}</span>
        <span class="rank-footer-name">{{ myNickname }}</span>
        <button class="rank-footer-btn" type="button" @click="emit('support')">为Ta助力</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { resolveImageUrl } from '../config';
import { useAuthStore } from '../store/auth';
import { getAnchorRank, type AnchorRankResult } from '../api/live';

const props = defineProps<{
  visible: boolean;
  liveIndexId?: number;
  anchorName?: string;
  anchorAvatar?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'support'): void;
}>();

type TabKey = 'rush' | 'hour' | 'day';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'rush', label: '抢热推' },
  { key: 'hour', label: '小时榜' },
  { key: 'day', label: '主播日榜' },
];

const activeTab = ref<TabKey>('rush');

const authStore = useAuthStore();

/** rankType：3 抢热推 / 1 小时榜 / 2 主播日榜 */
const RANK_TYPE: Record<TabKey, number> = { rush: 3, hour: 1, day: 2 };

const rankData = ref<AnchorRankResult | null>(null);
const loading = ref(false);
const loadError = ref('');

interface RankSlot {
  rank: number;
  name: string;
  avatar: string;
  score: string;
}

function placeholderSlot(rank: number): RankSlot {
  return { rank, name: '虚位以待', avatar: '', score: '' };
}

/** 接口返回的真实榜单 */
const rankRows = computed<RankSlot[]>(() =>
  (rankData.value?.rank_list || []).map((item, index) => ({
    rank: item.rank || index + 1,
    name: item.nickname || '虚位以待',
    avatar: resolveImageUrl(item.avatar),
    score: item.popularity === undefined || item.popularity === null ? '' : String(item.popularity),
  })),
);

/** 前三名领奖台：缺位时保留「虚位以待」占位 */
const podium = computed<RankSlot[]>(() =>
  [2, 1, 3].map((rank) => rankRows.value.find((row) => row.rank === rank) || placeholderSlot(rank)),
);

/** 4 名以后 */
const tailRows = computed<RankSlot[]>(() => {
  const rest = rankRows.value.filter((row) => row.rank >= 4);
  return rest.length ? rest : [4, 5, 6].map(placeholderSlot);
});

/** 抢热推没有领奖台，列表从第 1 名开始；其余两个榜从第 4 名开始 */
const listRows = computed<RankSlot[]>(() => {
  if (activeTab.value !== 'rush') {
    return tailRows.value;
  }
  return rankRows.value.length ? rankRows.value : [1, 2, 3, 4, 5, 6].map(placeholderSlot);
});

/** 抢热推当前推荐的直播主播 */
const recommendInfo = computed(() => rankData.value?.recommend_anchor_info || null);
const anchorName = computed(() => (activeTab.value === 'rush' ? recommendInfo.value?.nickname : '') || props.anchorName || '虚位以待');
const anchorAvatar = computed(() => {
  const recommendAvatar = recommendInfo.value?.avatar;
  if (recommendAvatar) {
    return resolveImageUrl(recommendAvatar);
  }
  return props.anchorAvatar ? resolveImageUrl(props.anchorAvatar) : '';
});
const anchorInitial = computed(() => (anchorName.value || 'N').slice(0, 1).toUpperCase());

/** 我的榜单信息 */
const selfInfo = computed(() => rankData.value?.anchor_rank_info || null);
const myRankText = computed(() => (selfInfo.value && selfInfo.value.rank > 0 ? `第 ${selfInfo.value.rank} 名` : '未上榜'));
const myNickname = computed(() => selfInfo.value?.nickname || authStore.userInfo?.nickname || '我');
const myInitial = computed(() => myNickname.value.slice(0, 1).toUpperCase());
const myAvatar = computed(() => {
  const selfAvatar = selfInfo.value?.avatar;
  if (selfAvatar) {
    return resolveImageUrl(selfAvatar);
  }
  const raw = authStore.userInfo?.avatar || '';
  return raw ? resolveImageUrl(raw) : '';
});

/** 抢热推倒计时：使用服务端下发的本轮剩余秒数 */
const rushRemain = ref(0);
let rushTimer: number | null = null;

const rushCountdownText = computed(() => {
  const minutes = Math.floor(rushRemain.value / 60);
  const seconds = rushRemain.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

let requestSeq = 0;

async function loadRank() {
  const liveIndexId = props.liveIndexId;
  if (!liveIndexId) {
    rankData.value = null;
    return;
  }
  const seq = ++requestSeq;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await getAnchorRank({
      liveIndexId,
      rankType: RANK_TYPE[activeTab.value],
      isEarlier: 0,
    });
    if (seq !== requestSeq) {
      return;
    }
    rankData.value = result;
    rushRemain.value = result?.minute_rank_remain_second || 0;
  } catch (error) {
    if (seq !== requestSeq) {
      return;
    }
    rankData.value = null;
    loadError.value = error instanceof Error ? error.message : '加载失败';
    console.warn('[PopularityRankPanel] load rank failed:', error);
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
    }
  }
}

function startRushTimer() {
  stopRushTimer();
  rushTimer = window.setInterval(() => {
    if (rushRemain.value > 0) {
      rushRemain.value -= 1;
      return;
    }
    // 本轮结束，重新拉取榜单
    if (props.visible) {
      loadRank();
    }
  }, 1000);
}

function stopRushTimer() {
  if (rushTimer !== null) {
    window.clearInterval(rushTimer);
    rushTimer = null;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadRank();
      startRushTimer();
    } else {
      stopRushTimer();
    }
  },
  { immediate: true },
);

watch(activeTab, () => {
  if (props.visible) {
    loadRank();
  }
});

onUnmounted(stopRushTimer);
</script>

<style lang="scss" scoped>
.rank-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.rank-panel {
  display: flex;
  flex-direction: column;
  width: 26rem;
  max-height: 92%;
  overflow: hidden;
  color: #fff;
  /* 与用户信息卡 / 更多直播一致的深色卡片底色 */
  background: linear-gradient(180deg, #23242b 0%, #191a20 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.875rem;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}

.rank-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.875rem 0.5rem;
}

.rank-head-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.9375rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #ffd479;
  background-color: rgba(255, 196, 84, 0.14);
  border: 1px solid rgba(255, 196, 84, 0.28);
  border-radius: 0.5rem;
}

.rank-head-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rank-help {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  cursor: default;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.rank-close {
  padding: 0;
  font-size: 0.875rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  background: none;
  border: none;

  &:hover {
    color: #fff;
  }
}

.rank-tabs {
  flex: none;
  display: flex;
  justify-content: center;
  gap: 0.375rem;
  padding: 0 0.875rem 0.5rem;
}

.rank-tab {
  padding: 0.1875rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    color: #fff;
    background-image: linear-gradient(90deg, #ff7aa2, #ff3d71);
    border-color: transparent;
  }
}

/* 抢热推 */
.rank-rush {
  flex: none;
  padding: 0 0.875rem 0.25rem;
  text-align: center;
}

.rank-rush-timer {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.6);
}

.rank-rush-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.8);
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.rank-rush-anchor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1875rem;
}

.rank-rush-avatar-wrap {
  width: 3.5rem;
  height: 3.5rem;
}

.rank-rush-avatar {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(255, 122, 162, 0.85);
}

.rank-rush-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 700;
  background-color: rgba(255, 255, 255, 0.12);
}

.rank-rush-name {
  font-size: 0.8125rem;
  font-weight: 700;
}

.rank-rush-tag {
  padding: 0 0.375rem;
  font-size: 0.625rem;
  line-height: 1rem;
  color: #ff9bb8;
  background-color: rgba(255, 61, 113, 0.16);
  border-radius: 0.5rem;
}

/* 前三名领奖台 */
.rank-podium {
  flex: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem 0;
}

.rank-podium-item {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  max-width: 6.5rem;

  &-1 {
    z-index: 2;
  }
}

.rank-podium-avatar {
  position: relative;
  z-index: 1;
  width: 3rem;
  height: 3rem;
  margin-bottom: -0.75rem;
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.22);
  background-color: rgba(255, 255, 255, 0.1);
}

.rank-podium-item-1 .rank-podium-avatar {
  width: 3.75rem;
  height: 3.75rem;
  margin-bottom: -0.875rem;
  border-color: #ffd479;
}

.rank-podium-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-podium-avatar-empty {
  display: block;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.12);
}

.rank-podium-pillar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding-top: 0.875rem;
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: none;
  border-radius: 0.5rem 0.5rem 0 0;

  .rank-podium-item-1 & {
    height: 5.5rem;
    background-image: linear-gradient(180deg, rgba(255, 61, 113, 0.22), rgba(255, 61, 113, 0.05));
    border-color: rgba(255, 61, 113, 0.28);
    border-bottom: none;
  }

  .rank-podium-item-2 &,
  .rank-podium-item-3 & {
    height: 4.25rem;
  }
}

.rank-podium-name {
  width: 100%;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-podium-score {
  margin-bottom: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
}

.rank-podium-number {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.28);
}

.rank-podium-item-1 .rank-podium-number {
  color: #ffd479;
}

/* 4 名以后 */
.rank-list {
  flex: 1;
  min-height: 0;
  padding: 0.5rem 0.875rem;
  overflow-y: auto;
}

.rank-tip {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 8rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
}

.rank-retry {
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(135deg, #ff7aa2, #ff3d71);
  border: none;
  border-radius: 0.75rem;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.125rem;

  & + .rank-row {
    margin-top: 0.375rem;
  }
}

.rank-row-index {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.65);
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.rank-row-body {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  height: 100%;
  padding: 0 0.625rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.75rem;
}

.rank-row-avatar {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.12);
}

.rank-row-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-row-avatar-empty {
  display: block;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.12);
}

.rank-row-name {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row-score {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
}

.rank-row-fire {
  font-size: 0.625rem;
}

/* 底部我的排名 */
.rank-footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background-color: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.rank-footer-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #ffd479;
  background-color: rgba(255, 196, 84, 0.14);
  border-radius: 0.625rem;
}

.rank-footer-avatar {
  flex: none;
  width: 1.625rem;
  height: 1.625rem;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.rank-footer-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: rgba(255, 255, 255, 0.12);
}

.rank-footer-name {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-footer-btn {
  flex: none;
  padding: 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.375rem;
  color: #fff;
  cursor: pointer;
  background-image: linear-gradient(90deg, #ff7aa2, #ff3d71);
  border: none;
  border-radius: 0.6875rem;

  &:hover {
    filter: brightness(1.08);
  }
}
</style>

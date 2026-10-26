<template>
  <UIKitProvider theme="dark">
    <div class="sub-page">
      <header class="sub-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="header-title">直播数据</span>
        </div>
        <div class="window-tool">
          <button class="window-tool-btn" type="button" @click="onMinimize"><svg-icon :icon="MinimizeIcon" /></button>
          <button class="window-tool-btn" type="button" @click="onToggleMaximize">
            <svg-icon v-if="!isMaximized" :icon="MaximizeIcon" />
            <svg-icon v-else :icon="MiniIcon" />
          </button>
          <button class="window-tool-btn" type="button" @click="onClose"><svg-icon :icon="CloseIcon" /></button>
        </div>
      </header>

      <main class="sub-body">
        <div class="filter-bar">
          <span class="filter-label">时间范围</span>
          <select class="filter-select" v-model="range" @change="reload">
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="all">全部</option>
          </select>
          <span class="summary">共 {{ list.length }} 场 · 累计 {{ totalDurationText }}</span>
        </div>

        <div class="session-list">
          <div class="session-card" v-for="(item, idx) in list" :key="idx">
            <div class="session-head">
              <div class="session-time">
                {{ item.startTime }} ~ {{ item.endTime }}
              </div>
              <span class="session-duration">{{ item.duration }}</span>
            </div>
            <div class="session-body">
              <div class="session-metric">
                <div class="metric-value">{{ formatNumber(item.income) }}</div>
                <div class="metric-label">本场收益 (K币)</div>
              </div>
              <div class="session-divider"></div>
              <div class="session-metric">
                <div class="metric-value">{{ formatNumber(item.viewers) }}</div>
                <div class="metric-label">观看人次</div>
              </div>
              <div class="session-metric">
                <div class="metric-value">{{ formatNumber(item.newFollow) }}</div>
                <div class="metric-label">新增关注</div>
              </div>
              <div class="session-metric">
                <div class="metric-value">{{ formatNumber(item.giftCount) }}</div>
                <div class="metric-label">送礼人数</div>
              </div>
            </div>
          </div>
          <div v-if="!list.length" class="empty">暂无直播数据</div>
        </div>
      </main>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';

const router = useRouter();
const isMaximized = ref(false);
const range = ref('7');

function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

interface Session {
  startTime: string; endTime: string; duration: string;
  income: number; viewers: number; newFollow: number; giftCount: number;
}

const allSessions: Session[] = [
  { startTime: '2026.10.26 13:28', endTime: '2026.10.26 13:46', duration: '00:18:13', income: 62596000, viewers: 2, newFollow: 0, giftCount: 2 },
  { startTime: '2026.10.26 13:20', endTime: '2026.10.26 13:27', duration: '00:06:58', income: 0, viewers: 3, newFollow: 0, giftCount: 0 },
  { startTime: '2026.10.26 13:17', endTime: '2026.10.26 13:17', duration: '00:00:42', income: 0, viewers: 2, newFollow: 0, giftCount: 0 },
  { startTime: '2026.10.26 13:11', endTime: '2026.10.26 13:13', duration: '00:01:37', income: 0, viewers: 2, newFollow: 0, giftCount: 0 },
  { startTime: '2026.10.25 20:00', endTime: '2026.10.25 21:30', duration: '01:30:05', income: 128000000, viewers: 156, newFollow: 23, giftCount: 41 },
  { startTime: '2026.10.24 19:00', endTime: '2026.10.24 20:12', duration: '01:12:20', income: 86000000, viewers: 98, newFollow: 12, giftCount: 28 },
];

const list = ref<Session[]>(allSessions);
function reload() { list.value = allSessions; }

function formatNumber(n: number) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}

const totalDurationText = computed(() => {
  let s = 0;
  list.value.forEach(i => {
    const [h, m, ss] = i.duration.split(':').map(Number);
    s += h * 3600 + m * 60 + ss;
  });
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
});

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
});
</script>

<style scoped>
.sub-page { display: flex; flex-direction: column; height: 100vh; background: #0a0a10; color: #e6e6ea; }
.sub-header {
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 10px 0 0;
  background: rgba(20,20,28,0.85); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  -webkit-app-region: drag; flex-shrink: 0;
}
.header-left, .window-tool { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.filter-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  padding: 12px 18px; border-radius: 12px;
  background: rgba(30,30,42,0.95); border: 1px solid rgba(255,255,255,0.05);
}
.filter-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.filter-select {
  height: 30px; padding: 0 10px;
  border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
  background: #1e1e2a; color: #fff; font-size: 12px;
  cursor: pointer; outline: none;
}
.filter-select:focus { border-color: rgba(139,123,230,0.4); }
.filter-select option { background: #1e1e2a; color: #e6e6ea; }
.summary { margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.5); }

.session-list { display: flex; flex-direction: column; gap: 14px; }
.session-card {
  background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; padding: 18px 22px;
  transition: border-color 0.2s;
}
.session-card:hover { border-color: rgba(139,92,246,0.2); }
.session-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.session-time { font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 500; }
.session-duration { font-size: 12px; color: #b39fff; background: rgba(139,92,246,0.12); padding: 3px 10px; border-radius: 10px; }

.session-body { display: flex; align-items: center; gap: 16px; }
.session-metric { flex: 1; min-width: 0; text-align: center; }
.session-metric:first-child { text-align: left; flex: 1.3; }
.metric-value { font-size: 20px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.session-metric:first-child .metric-value { color: #fbbf24; }
.metric-label { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 4px; }
.session-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

.empty { text-align: center; padding: 60px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

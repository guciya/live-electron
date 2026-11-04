<template>
  <UIKitProvider theme="dark">
    <div class="sub-page">
      <PageThreeBackdrop variant="task" />
      <header class="sub-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="header-title">主播任务中心</span>
        </div>
        <div class="header-right">
          <span class="coin-tip">今日累计奖励：<b>{{ totalReward }}</b> K币</span>
          <button class="revenue-btn" type="button" @click="openRevenue">收益明细</button>
          <div class="window-tool">
            <button class="window-tool-btn" type="button" @click="onMinimize"><svg-icon :icon="MinimizeIcon" /></button>
            <button class="window-tool-btn" type="button" @click="onToggleMaximize">
              <svg-icon v-if="!isMaximized" :icon="MaximizeIcon" />
              <svg-icon v-else :icon="MiniIcon" />
            </button>
            <button class="window-tool-btn" type="button" @click="onClose"><svg-icon :icon="CloseIcon" /></button>
          </div>
        </div>
      </header>

      <main class="sub-body">
        <!-- Banner -->
        <section class="hero">
          <div class="hero-bg"></div>
          <PageThreeBackdrop variant="task" mode="inline" />
          <div class="hero-content">
            <div class="hero-title">主播日常开播激励</div>
            <div class="hero-sub">活动时间：2025.01.01 - 长期有效</div>
          </div>
        </section>

        <!-- 任务列表 -->
        <section class="task-list" v-if="!loading && !error && tasks.length">
          <div class="task-card" v-for="t in tasks" :key="t.task_id">
            <div class="task-icon">
              <img v-if="t.task_icon" :src="resolveImageUrl(t.task_icon)" alt="" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
              </svg>
            </div>
            <div class="task-info">
              <div class="task-title">{{ t.task_name }}</div>
              <div class="task-desc" v-if="t.task_desc">{{ t.task_desc }}</div>
              <div class="task-reward">奖励：<b>{{ t.reward_count }}</b>{{ t.reward_type === 2 ? ' K币' : '' }}</div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progressWidth(t.progress) + '%' }"></div>
              </div>
              <div class="progress-text">进度 {{ t.progress }}%</div>
            </div>
            <span class="task-status" :class="{ 'task-status--done': t.is_complete }">
              {{ t.is_complete ? '已完成' : '未完成' }}
            </span>
          </div>
        </section>

        <div class="state-block" v-else-if="loading">加载中...</div>
        <div class="state-block state-block--error" v-else-if="error">
          <p>{{ error }}</p>
          <button class="retry-btn" type="button" @click="loadTasks">重试</button>
        </div>
        <div class="state-block" v-else>暂无任务</div>

        <!-- 活动说明 -->
        <section class="explain-card">
          <div class="explain-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
            </svg>
            活动说明
          </div>
          <p class="explain-text">
            完成每日任务即可获得对应奖励，奖励每日刷新。<br>
            当日未完成即作废，不可跨日叠加任务进度！
          </p>
        </section>
      </main>

      <!-- 收益明细 -->
      <transition name="fade">
        <div class="modal-mask" v-if="revenueVisible" @click.self="revenueVisible = false">
          <div class="modal-card">
            <div class="modal-header">
              <span>收益明细</span>
              <button class="modal-close" type="button" @click="revenueVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="revenue-total">
                <span class="revenue-total-label">累计收益</span>
                <span class="revenue-total-value">{{ totalRevenue }} K币</span>
              </div>

              <div class="state-block" v-if="revenueLoading">加载中...</div>
              <div class="state-block state-block--error" v-else-if="revenueError">
                <p>{{ revenueError }}</p>
                <button class="retry-btn" type="button" @click="loadRevenue">重试</button>
              </div>
              <div class="revenue-list" v-else-if="revenueList.length">
                <div class="revenue-item" v-for="(r, i) in revenueList" :key="i">
                  <div class="revenue-info">
                    <div class="revenue-name">{{ revenueName(r) }}</div>
                    <div class="revenue-time" v-if="revenueTime(r)">{{ revenueTime(r) }}</div>
                  </div>
                  <span class="revenue-amount">+{{ revenueAmount(r) }} K币</span>
                </div>
              </div>
              <div class="state-block" v-else>暂无收益明细</div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import PageThreeBackdrop from '../../niko/components/PageThreeBackdrop.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import { resolveImageUrl } from '../../niko/config';
import { getAnchorTaskList, getAnchorTaskRevenueList, type AnchorTaskItem, type AnchorTaskRevenueItem } from '../../niko/api/live';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

/* ---------- 任务列表 ---------- */
const tasks = ref<AnchorTaskItem[]>([]);
const loading = ref(false);
const error = ref('');

async function loadTasks() {
  loading.value = true;
  error.value = '';
  try {
    const data = await getAnchorTaskList();
    tasks.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('loadAnchorTaskList failed', e);
    error.value = '任务列表加载失败';
  } finally {
    loading.value = false;
  }
}

const totalReward = computed(() => tasks.value.filter(t => t.is_complete).reduce((s, t) => s + Number(t.reward_count || 0), 0));
function progressWidth(progress: number) { return Math.min(Number(progress) || 0, 100); }

/* ---------- 收益明细 ---------- */
const revenueVisible = ref(false);
const revenueLoading = ref(false);
const revenueError = ref('');
const revenueList = ref<AnchorTaskRevenueItem[]>([]);
const totalRevenue = ref(0);

function openRevenue() {
  revenueVisible.value = true;
  loadRevenue();
}
async function loadRevenue() {
  revenueLoading.value = true;
  revenueError.value = '';
  try {
    const data = await getAnchorTaskRevenueList();
    revenueList.value = Array.isArray(data?.revenue_list) ? data.revenue_list : [];
    totalRevenue.value = Number(data?.total_revenue ?? 0);
  } catch (e) {
    console.warn('loadAnchorTaskRevenueList failed', e);
    revenueError.value = '收益明细加载失败';
  } finally {
    revenueLoading.value = false;
  }
}
function revenueName(item: AnchorTaskRevenueItem) {
  const raw = item as Record<string, any>;
  return raw.task_name || raw.revenue_name || '任务收益';
}
function revenueAmount(item: AnchorTaskRevenueItem) {
  const raw = item as Record<string, any>;
  return Number(raw.revenue_count ?? raw.amount ?? 0);
}
function revenueTime(item: AnchorTaskRevenueItem) {
  return (item as Record<string, any>).create_time || '';
}

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
  loadTasks();
});
</script>

<style scoped>
.sub-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    radial-gradient(circle at 84% 88%, rgba(139, 92, 246, 0.1), transparent 46%),
    radial-gradient(circle at 6% 10%, rgba(244, 114, 182, 0.05), transparent 44%),
    #0a0a10;
  color: #e6e6ea;
}
.sub-header,
.sub-body { position: relative; z-index: 1; }
.sub-header {
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 10px 0 0;
  background: rgba(20,20,28,0.85); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  -webkit-app-region: drag; flex-shrink: 0;
}
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.coin-tip { font-size: 12px; color: rgba(255,255,255,0.55); margin-right: 12px; }
.coin-tip b { color: #ffd36b; font-weight: 700; }
.revenue-btn { height: 28px; padding: 0 12px; border: none; background: rgba(139,92,246,0.16); color: #b39fff; font-size: 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
.revenue-btn:hover { background: rgba(139,92,246,0.3); color: #fff; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; }

.hero { position: relative; border-radius: 16px; overflow: hidden; height: 120px; flex-shrink: 0; }
.hero-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(500px 180px at 0% 0%, rgba(139,92,246,0.45), transparent 60%),
    radial-gradient(400px 180px at 100% 100%, rgba(244,114,182,0.3), transparent 60%),
    linear-gradient(135deg, #1a1033, #241644);
}
.hero-content { position: relative; z-index: 2; padding: 22px 28px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
.hero-title { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 1px; }
.hero-sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 6px; }

.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(30,30,42,0.8), rgba(22,22,30,0.74));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  transition: border-color 0.2s;
}
.task-card:hover { border-color: rgba(139,92,246,0.2); }
.task-icon {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: rgba(139,92,246,0.16); color: #b39fff;
  overflow: hidden;
}
.task-icon svg { width: 24px; height: 24px; }
.task-icon img { width: 100%; height: 100%; object-fit: cover; }
.task-info { flex: 1; min-width: 0; }
.task-title { font-size: 14px; font-weight: 600; color: #fff; }
.task-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.task-reward { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.task-reward b { color: #ffd36b; font-weight: 600; }
.progress-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #f472b6); border-radius: 2px; transition: width 0.3s; }
.progress-text { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 5px; }
.task-status {
  flex-shrink: 0; font-size: 11px; padding: 4px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.1);
}
.task-status--done { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.3); }

.state-block { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }
.state-block p { margin: 0 0 12px; }
.retry-btn { height: 30px; padding: 0 16px; border: 1px solid rgba(139,92,246,0.4); border-radius: 8px; background: rgba(139,92,246,0.16); color: #b39fff; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.retry-btn:hover { background: rgba(139,92,246,0.3); color: #fff; }

.explain-card { padding: 18px 22px; background: rgba(30,30,42,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; }
.explain-title { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #f0f0f4; margin-bottom: 10px; }
.explain-title svg { width: 16px; height: 16px; color: #b39fff; }
.explain-text { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.8; margin: 0; }

/* 收益明细弹层 */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 480px; max-height: 70vh; background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-close svg { width: 16px; height: 16px; }
.modal-body { padding: 18px 22px; overflow-y: auto; }
.revenue-total { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 12px; border-radius: 10px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); }
.revenue-total-label { font-size: 12px; color: rgba(255,255,255,0.6); }
.revenue-total-value { font-size: 20px; font-weight: 700; color: #ffd36b; }
.revenue-list { display: flex; flex-direction: column; gap: 8px; }
.revenue-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
.revenue-info { flex: 1; min-width: 0; }
.revenue-name { font-size: 13px; color: #fff; font-weight: 600; }
.revenue-time { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 3px; }
.revenue-amount { font-size: 13px; font-weight: 600; color: #4ade80; flex-shrink: 0; }

.modal-body::-webkit-scrollbar { width: 5px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

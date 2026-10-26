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
          <span class="header-title">主播任务中心</span>
        </div>
        <div class="header-right">
          <span class="coin-tip">今日累计奖励：<b>{{ totalReward }}</b> K币</span>
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
          <div class="hero-content">
            <div class="hero-title">主播日常开播激励</div>
            <div class="hero-sub">活动时间：2025.01.01 - 长期有效</div>
          </div>
        </section>

        <!-- 任务列表 -->
        <section class="task-list">
          <div class="task-card" v-for="(t, i) in tasks" :key="i">
            <div class="task-icon" :class="'task-icon--' + t.kind">
              <svg v-if="t.kind === 'live'" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <polygon points="10 7 17 12 10 17" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
              </svg>
            </div>
            <div class="task-info">
              <div class="task-title">{{ t.title }}</div>
              <div class="task-reward">奖励：<b>{{ t.reward }}</b> K币</div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: t.progress + '%' }"></div>
              </div>
              <div class="progress-text">{{ t.progressText }}</div>
            </div>
            <button
              class="task-btn"
              :class="{ 'task-btn--done': t.done }"
              :disabled="t.done"
              type="button"
              @click="claim(t)"
            >{{ t.done ? '已领取' : (t.progress >= 100 ? '领取奖励' : '未完成') }}</button>
          </div>
        </section>

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
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

interface Task {
  title: string; reward: number; kind: 'live' | 'star';
  progress: number; progressText: string; done: boolean;
}
const tasks = ref<Task[]>([
  { title: '开播 2 小时', reward: 2000, kind: 'live', progress: 43, progressText: '43 分 28 秒 / 2 小时', done: false },
  { title: '开播 4 小时', reward: 4000, kind: 'live', progress: 43, progressText: '43 分 28 秒 / 4 小时', done: false },
  { title: '完成 1 场直播', reward: 500, kind: 'star', progress: 100, progressText: '1 / 1', done: false },
  { title: '收到 10 个礼物', reward: 1500, kind: 'star', progress: 60, progressText: '6 / 10', done: false },
  { title: '新增 5 位关注', reward: 1000, kind: 'star', progress: 0, progressText: '0 / 5', done: false },
]);

const totalReward = computed(() => tasks.value.filter(t => t.done).reduce((s, t) => s + t.reward, 0));
function claim(t: Task) {
  if (t.progress < 100) return;
  t.done = true;
  showMessage({ type: MessageToastType.Success, message: `已领取 ${t.reward} K币` });
}

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
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.coin-tip { font-size: 12px; color: rgba(255,255,255,0.55); margin-right: 12px; }
.coin-tip b { color: #ffd36b; font-weight: 700; }
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
.hero-content { position: relative; padding: 22px 28px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
.hero-title { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 1px; }
.hero-sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 6px; }

.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  transition: border-color 0.2s;
}
.task-card:hover { border-color: rgba(139,92,246,0.2); }
.task-icon {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.task-icon svg { width: 24px; height: 24px; }
.task-icon--live { background: rgba(244,114,182,0.16); color: #f472b6; }
.task-icon--star { background: rgba(251,191,36,0.16); color: #fbbf24; }
.task-info { flex: 1; min-width: 0; }
.task-title { font-size: 14px; font-weight: 600; color: #fff; }
.task-reward { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.task-reward b { color: #ffd36b; font-weight: 600; }
.progress-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #f472b6); border-radius: 2px; transition: width 0.3s; }
.progress-text { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 5px; }
.task-btn {
  height: 36px; padding: 0 18px; border-radius: 18px;
  border: none; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;
  background: linear-gradient(90deg, #6b46c1, #8b5cf6); color: #fff;
  transition: transform 0.12s, box-shadow 0.2s, opacity 0.2s;
  box-shadow: 0 2px 10px rgba(139,92,246,0.3);
}
.task-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(139,92,246,0.45); }
.task-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.task-btn--done { background: rgba(34,197,94,0.2); color: #4ade80; box-shadow: none; }

.explain-card { padding: 18px 22px; background: rgba(30,30,42,0.95); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; }
.explain-title { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #f0f0f4; margin-bottom: 10px; }
.explain-title svg { width: 16px; height: 16px; color: #b39fff; }
.explain-text { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.8; margin: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

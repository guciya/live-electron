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
          <span class="header-title">主播等级</span>
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
        <!-- 当前等级卡 -->
        <section class="level-hero">
          <div class="hero-bg"></div>
          <div class="hero-content">
            <div class="current-level">
              <div class="level-crown">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M2 20h20" stroke-linecap="round" />
                  <path d="M4 20l2-10 6 4 6-4 2 10" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="level-num">Lv.<span>7</span></div>
              <div class="level-name">青铜主播</div>
            </div>
            <div class="level-progress">
              <div class="progress-head">
                <span>距离 Lv.8 还差 <b>{{ remain }}</b> 经验</span>
                <span>{{ exp }} / {{ nextLevelExp }}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: (exp / nextLevelExp * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 等级权益 -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">等级特权</span>
          </div>
          <div class="priv-list">
            <div class="priv-item" v-for="(p, i) in privs" :key="i">
              <div class="priv-icon" :class="{ 'priv-icon--locked': !p.unlocked }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path v-if="p.unlocked" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
                  <path v-else d="M5 11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1M5 11v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11M5 11h14M9 16h6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="priv-info">
                <div class="priv-name">{{ p.name }}</div>
                <div class="priv-desc">{{ p.desc }}</div>
              </div>
              <span class="priv-tag" :class="{ 'priv-tag--locked': !p.unlocked }">
                {{ p.unlocked ? '已解锁' : 'Lv.' + p.req }}
              </span>
            </div>
          </div>
        </section>

        <!-- 升级规则 -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">升级规则</span>
          </div>
          <ul class="rule-list">
            <li>直播 1 小时可获得 50 经验</li>
            <li>每收到 100 心动礼物获得 1 经验</li>
            <li>每日最多可获得 500 经验</li>
            <li>经验值永久累积，不会过期</li>
          </ul>
        </section>
      </main>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

const exp = ref(350);
const nextLevelExp = ref(500);
const remain = nextLevelExp.value - exp.value;

interface Priv { name: string; desc: string; unlocked: boolean; req: number; }
const privs: Priv[] = [
  { name: '专属等级徽章', desc: '直播间头像旁显示等级徽章', unlocked: true, req: 1 },
  { name: '开播无延迟特权', desc: '开播延迟降低至 200ms', unlocked: true, req: 5 },
  { name: '专属礼物样式', desc: '解锁 5 款专属礼物', unlocked: true, req: 7 },
  { name: '官方推荐位', desc: '每周 1 次官方推荐曝光', unlocked: false, req: 10 },
  { name: '粉丝团自动回复', desc: '粉丝团开启自动回复特权', unlocked: false, req: 15 },
  { name: '线下活动邀请', desc: '平台线下活动优先邀请', unlocked: false, req: 20 },
];

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
});
</script>

<style scoped>
.sub-page { display: flex; flex-direction: column; height: 100vh; background: #0a0a10; color: #e6e6ea; }
.sub-header { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 10px 0 0; background: rgba(20,20,28,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); -webkit-app-region: drag; flex-shrink: 0; }
.sub-header .header-left, .sub-header .window-tool { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }

/* Hero */
.level-hero { position: relative; border-radius: 16px; overflow: hidden; padding: 28px 32px; }
.hero-bg { position: absolute; inset: 0; background: radial-gradient(400px 200px at 0% 50%, rgba(251,191,36,0.25), transparent 60%), linear-gradient(135deg, #2d1f0a, #1a1033); }
.hero-content { position: relative; display: flex; align-items: center; gap: 32px; }
.current-level { text-align: center; }
.level-crown { width: 38px; height: 38px; margin: 0 auto 6px; color: #fbbf24; }
.level-crown svg { width: 100%; height: 100%; }
.level-num { font-size: 42px; font-weight: 800; color: #fff; letter-spacing: -1px; }
.level-num span { color: #fbbf24; }
.level-name { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 2px; }
.level-progress { flex: 1; min-width: 0; }
.progress-head { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.progress-head b { color: #ffd36b; }
.progress-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); border-radius: 4px; }

/* Section card */
.section-card { background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9)); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 18px 22px; }
.section-header { margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 700; color: #f0f0f4; }

/* Privileges */
.priv-list { display: flex; flex-direction: column; gap: 10px; }
.priv-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
.priv-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(139,92,246,0.15); color: #b39fff; }
.priv-icon svg { width: 18px; height: 18px; }
.priv-icon--locked { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }
.priv-info { flex: 1; min-width: 0; }
.priv-name { font-size: 13px; font-weight: 600; color: #fff; }
.priv-desc { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.priv-tag { font-size: 11px; padding: 3px 10px; border-radius: 10px; background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.priv-tag--locked { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.1); }

.rule-list { margin: 0; padding-left: 18px; font-size: 12px; color: rgba(255,255,255,0.6); line-height: 2; }
.rule-list li::marker { color: #b39fff; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

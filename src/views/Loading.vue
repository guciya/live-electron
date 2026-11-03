<template>
  <!-- 礼物覆盖窗口：透明背景、不显示 splash，直接落到路由 -->
  <div v-if="isGiftOverlay" class="tui-loading tui-loading--overlay"></div>

  <!-- 主 Splash：多层旋转轨道 + 卫星 + 自转 logo -->
  <div
    v-else
    class="tui-loading splash-root"
    :class="{ 'splash-fade-out': fadingOut }"
  >
    <!-- 背景光晕 -->
    <div class="splash-bg"></div>

    <!-- 中心 logo + 多层反向旋转轨道 -->
    <div class="splash-core">
      <!-- 最外：刻度轨道（正向慢转，像仪表盘） -->
      <div class="splash-ring splash-ring--scale"></div>
      <!-- 外圈：渐变弧条（反向慢转） -->
      <div class="splash-ring splash-ring--outer"></div>
      <!-- 中圈：虚线 + 两颗卫星（正向中速） -->
      <div class="splash-ring splash-ring--middle">
        <span class="splash-sat splash-sat--a"></span>
        <span class="splash-sat splash-sat--b"></span>
      </div>
      <!-- 内圈：能量弧（反向快速） -->
      <div class="splash-ring splash-ring--inner"></div>

      <!-- logo（自身也缓慢自转 + 呼吸） -->
      <div class="splash-logo">
        <div class="splash-logo-inner">
          <div class="splash-logo-dot"></div>
        </div>
      </div>
    </div>

    <!-- 底部呼吸进度 + 文案 -->
    <div class="splash-footer">
      <div class="splash-progress">
        <span class="splash-progress-bar"></span>
      </div>
      <div class="splash-text">
        欢迎来到 Niko直播伴侣
        <span class="splash-text-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import router from '../router';
import { isMainWindow } from '../TUILiveKit/utils/envUtils';
import logger from '../TUILiveKit/utils/logger';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';

const logPrefix = '[Loading.vue]';

const isGiftOverlay = computed(() => (window as any).__WINDOW_ROLE__ === 'gift-overlay');
/** confirm / 其他工具窗口不参与登录跳转竞争，让 did-finish-load 的 hash 路由直接生效 */
const skipLoginGate = computed(() => {
  const role = (window as any).__WINDOW_ROLE__;
  return role === 'gift-overlay' || role === 'confirm';
});

/** 淡出过渡（splash 至少展示 MIN_SPLASH_MS，避免一闪而过） */
const fadingOut = ref(false);
const MIN_SPLASH_MS = 1500;
let _startTs = performance.now();

function gotoLogin() {
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  router.push('/login');
}

/** 确保 splash 至少展示 MIN_SPLASH_MS 后再跳转，防止闪屏 */
function ensureMinSplash(): Promise<void> {
  const elapsed = performance.now() - _startTs;
  const waitFor = Math.max(0, MIN_SPLASH_MS - elapsed);
  return new Promise((resolve) => window.setTimeout(resolve, waitFor));
}

async function init(userInfo: Record<string, any>) {
  logger.log(`${logPrefix}init:`, userInfo);
  const isMain = await isMainWindow();
  await ensureMinSplash();
  fadingOut.value = true;
  // 给淡出动画 300ms 生效时间
  window.setTimeout(() => {
    if (isMain) {
      window.ipcRenderer.send('openTUILiveKit', { userInfo });
      router.push({ name: 'anchor-list' });
    }
  }, 320);
}

onMounted(() => {
  _startTs = performance.now();

  // confirm / gift-overlay 等工具窗口：不参与登录态检查，
  // 等 main 进程 did-finish-load 里设置 hash 路由后自动生效
  if (skipLoginGate.value) {
    return;
  }

  const storedUserInfo = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  let userInfo;
  if (!storedUserInfo) {
    void ensureMinSplash().then(() => {
      fadingOut.value = true;
      window.setTimeout(() => gotoLogin(), 320);
    });
    return;
  }
  try {
    userInfo = JSON.parse(storedUserInfo);
  } catch (e) {
    logger.error(`${logPrefix}onMounted parse userInfo error:`, e);
    void ensureMinSplash().then(() => {
      fadingOut.value = true;
      window.setTimeout(() => gotoLogin(), 320);
    });
    return;
  }

  void init(userInfo);
});
</script>

<style lang="scss" scoped>
.tui-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
}

.tui-loading--overlay {
  background: transparent;
}

/* ================ Splash 根 ================ */
.splash-root {
  position: relative;
  flex-direction: column;
  gap: 48px;
  overflow: hidden;
  background: radial-gradient(ellipse at center, #1a1d2e 0%, #0b0d14 60%, #050609 100%);
  transition: opacity 0.3s ease;

  &.splash-fade-out {
    opacity: 0;
  }
}

/* 背景浮动光斑 */
.splash-bg {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 35% 40%, rgba(22, 119, 255, 0.15) 0%, transparent 45%),
    radial-gradient(circle at 65% 60%, rgba(106, 92, 255, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 50% 30%, rgba(255, 76, 153, 0.08) 0%, transparent 40%);
  animation: bgPulse 8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes bgPulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50%      { transform: scale(1.1); opacity: 1; }
}

/* ================ 中心核心（logo + 5 层旋转轨道） ================ */
.splash-core {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 通用圆环 */
.splash-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

/* ---- 最外：刻度轨道（正向极慢，像仪表盘） ---- */
.splash-ring--scale {
  width: 200px;
  height: 200px;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.35) 0deg 1deg,
    transparent 1deg 6deg
  );
  animation: spin 22s linear infinite;
  -webkit-mask: radial-gradient(circle, transparent 88%, #000 90%);
          mask: radial-gradient(circle, transparent 88%, #000 90%);
}

/* ---- 外圈：渐变弧 + 反向慢转 ---- */
.splash-ring--outer {
  width: 180px;
  height: 180px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(22, 119, 255, 0.9) 40deg,
    transparent 80deg,
    transparent 180deg,
    rgba(255, 76, 153, 0.7) 220deg,
    transparent 260deg
  );
  filter: drop-shadow(0 0 8px rgba(22, 119, 255, 0.35));
  animation: spinReverse 6s linear infinite;
  -webkit-mask: radial-gradient(circle, transparent 68%, #000 70%);
          mask: radial-gradient(circle, transparent 68%, #000 70%);
}

/* ---- 中圈：虚线 + 两颗卫星（正向中速） ---- */
.splash-ring--middle {
  width: 140px;
  height: 140px;
  border: 1.5px dashed rgba(255, 255, 255, 0.18);
  animation: spin 8s linear infinite;
}

/* 轨道卫星（沿中圈公转） */
.splash-sat {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #ffd84d;
  box-shadow: 0 0 10px rgba(255, 216, 77, 0.9);
}

.splash-sat--a {
  /* 沿中圈半径 + 角度偏移放置 */
  transform: translate(0, -66px); /* 90° 位置（顶部） */
  background: #4de8ff;
  box-shadow: 0 0 12px rgba(77, 232, 255, 0.9);
}

.splash-sat--b {
  transform: translate(0, 66px);  /* 270° 位置（底部） */
  background: #ff7bc3;
  box-shadow: 0 0 12px rgba(255, 123, 195, 0.9);
}

/* ---- 内圈：能量弧（反向快速） ---- */
.splash-ring--inner {
  width: 100px;
  height: 100px;
  background: conic-gradient(
    from 0deg,
    rgba(106, 92, 255, 0.9) 0deg,
    transparent 55deg,
    transparent 180deg,
    rgba(22, 119, 255, 0.9) 220deg,
    transparent 275deg
  );
  filter: drop-shadow(0 0 6px rgba(106, 92, 255, 0.4));
  animation: spinReverse 2.8s linear infinite;
  -webkit-mask: radial-gradient(circle, transparent 72%, #000 74%);
          mask: radial-gradient(circle, transparent 72%, #000 74%);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes spinReverse {
  from { transform: rotate(360deg); }
  to   { transform: rotate(0deg); }
}

/* ---- 中心 logo（自身自转 + 呼吸 + 弹性淡入） ---- */
.splash-logo {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #6a5cff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 30px rgba(22, 119, 255, 0.45),
    0 0 60px rgba(106, 92, 255, 0.25),
    inset 0 0 18px rgba(255, 255, 255, 0.15);
  /* logo 自身也缓慢自转！ */
  animation:
    logoPop 0.7s cubic-bezier(0.22, 1.2, 0.36, 1) both,
    spin 14s linear infinite;
}

.splash-logo-inner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.splash-logo-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
  /* 抵消外层 logo 自转，让白点看起来始终朝上 + 自己呼吸 */
  animation: logoDotBreath 2.4s ease-in-out infinite;
}

@keyframes logoPop {
  0%   { transform: scale(0.3); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes logoDotBreath {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%      { transform: scale(1.15); opacity: 0.85; }
}

/* ================ 底部 ================ */
.splash-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: footerIn 0.9s ease-out 0.2s both;
}

@keyframes footerIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 进度条 */
.splash-progress {
  width: 180px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.splash-progress-bar {
  display: block;
  width: 40%;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #1677ff 40%, #6a5cff 70%, transparent);
  animation: progressSlide 1.6s ease-in-out infinite;
}

@keyframes progressSlide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

/* 品牌文案 */
.splash-text {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.75);
}

.splash-text-dots span {
  display: inline-block;
  width: 5px;
  margin-left: 1px;
  animation: dotBlink 1.4s steps(1, end) infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes dotBlink {
  0%, 50%   { opacity: 0.2; }
  51%, 100% { opacity: 1; }
}
</style>

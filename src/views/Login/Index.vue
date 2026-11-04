<template>
  <UIKitProvider theme="dark">
    <div class="tui-login-page">
    <div class="tui-login-bg" aria-hidden="true">
      <video class="tui-login-bg-video" :src="loginStageVideo" autoplay loop muted playsinline></video>
      <audio ref="loginDjAudio" :src="loginDjAudioSrc" autoplay loop preload="auto"></audio>
      <canvas ref="loginThreeCanvas" class="tui-login-bg-three"></canvas>
    </div>
    <div class="tui-login-header">
      <div class="window-tool tui-window-header">
        <button class="tui-live-icon" @click="onMinimize">
          <svg-icon :icon=MinimizeIcon></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onToggleMaximize">
          <svg-icon v-if="!isMaximized" :icon=MaximizeIcon></svg-icon>
          <svg-icon v-else :icon=MiniIcon></svg-icon>
        </button>
        <button class="tui-live-icon" @click="onClose">
          <svg-icon :icon=CloseIcon ></svg-icon>
        </button>
      </div>
    </div>
    <div class="tui-login-body">
      <div class="tui-login-card">
        <div class="tui-login-card-header">
          <img class="tui-login-logo-img" src="../../assets/niko-logo.png" alt="Niko直播伴侣" />
          <span class="tui-login-title-text">Niko直播伴侣</span>
        </div>

        <div class="tui-login-options">
          <div class="tui-login-field">
            <span class="tui-field-label">{{ t('Mobile number') }}</span>
            <div class="tui-login-option-input">
              <span class="tui-area-code">+86</span>
              <input
                v-model="mobile"
                class="tui-field-input"
                type="tel"
                inputmode="numeric"
                maxlength="11"
                :placeholder="t('Please enter your phone number!')"
                autocomplete="off"
              />
            </div>
          </div>

          <div class="tui-login-field">
            <span class="tui-field-label">{{ t('Verification code') }}</span>
            <div class="tui-login-option-input">
              <input
                v-model="verifyCode"
                class="tui-field-input"
                type="tel"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('Please enter a 6-digit verification code')"
                @keydown.enter="handleLogin"
                autocomplete="off"
              />
              <button
                class="tui-msg-control"
                type="button"
                :disabled="countdown > 0 || sending || !canSend"
                @click="handleSendCode"
              >
                <span :class="{ 'tui-msg-sent': countdown > 0 }">
                  {{ countdown > 0 ? `${countdown}${t('s')}` : (sending ? t('Sending...') : t('Send code')) }}
                </span>
              </button>
            </div>
          </div>

          <button class="tui-login-button tui-button-ripple" :disabled="isLoggingIn" @click="handleLogin">
            <span class="button">{{ !isLoggingIn ? t('Log In') : t('Logging In')}}</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, Ref } from 'vue';
import * as THREE from 'three';
import loginStageVideo from '../../assets/niko-login-stage.mp4';
import loginDjAudioSrc from '../../assets/niko-login-stage.mp4';
import router from '../../router';
import { getWindowType } from '../../TUILiveKit/utils/envUtils';
import { UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import TUIMessageBox from '../../TUILiveKit/common/base/MessageBox';
import logger from '../../TUILiveKit/utils/logger';
import { LoginType } from './types';
import { USER_INFO_STORAGE_KEY } from '../../TUILiveKit/utils/userInfoStorage';
import { NIKO_CONFIG } from '../../niko/config';
import { useAuthStore } from '../../niko/store/auth';
import { codeLogin, sendVerifyCode } from '../../niko/api/user';

const { t } = useUIKit();
const authStore = useAuthStore();

const MOBILE_STORAGE_KEY = 'niko_live_mobile';

const mobile = ref(window.localStorage.getItem(MOBILE_STORAGE_KEY) || '');
const verifyCode = ref('');
const isLoggingIn = ref(false);
const sending = ref(false);

const countdown = ref(0);
let countdownTimer: number | null = null;

const canSend = computed(() => /^1[3-9]\d{9}$/.test(mobile.value));
const loginThreeCanvas = ref<HTMLCanvasElement | null>(null);
const loginDjAudio = ref<HTMLAudioElement | null>(null);
let loginThreeCleanup: (() => void) | null = null;

function playLoginDj() {
  const audio = loginDjAudio.value;
  if (!audio) return;
  audio.volume = 0.32;
  void audio.play().catch(() => undefined);
}

function initLoginThree(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return () => undefined;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8.6);





  const particleTexture = (() => {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 64;
    textureCanvas.height = 64;
    const context = textureCanvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.28)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(textureCanvas);
  })();

  const starCount = 1000;
  const starPositions = new Float32Array(starCount * 3);
  const starBasePositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starPhases = new Float32Array(starCount);
  const starPalette = [0x62e9ff, 0x7797ff, 0xc47cff, 0xffffff];
  for (let index = 0; index < starCount; index += 1) {
    const offset = index * 3;
    starBasePositions[offset] = (Math.random() - 0.5) * 17;
    starBasePositions[offset + 1] = (Math.random() - 0.5) * 10.4;
    starBasePositions[offset + 2] = -5 + Math.random() * 6.5;
    starPositions[offset] = starBasePositions[offset];
    starPositions[offset + 1] = starBasePositions[offset + 1];
    starPositions[offset + 2] = starBasePositions[offset + 2];
    starPhases[index] = Math.random() * Math.PI * 2;
    const color = new THREE.Color(starPalette[Math.floor(Math.random() * starPalette.length)]);
    color.multiplyScalar(0.45 + Math.random() * 0.55);
    starColors[offset] = color.r;
    starColors[offset + 1] = color.g;
    starColors[offset + 2] = color.b;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: 0.055,
    map: particleTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const pointerTarget = new THREE.Vector2();
  const pointerWorld = new THREE.Vector3(100, 100, 0);
  const raycaster = new THREE.Raycaster();
  const clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const screenToWorld = (clientX: number, clientY: number, target: THREE.Vector3, pointer: THREE.Vector2) => {
    pointer.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(clickPlane, target);
  };
  const getPointerWorld = (event: PointerEvent) => (
    screenToWorld(event.clientX, event.clientY, pointerWorld, pointerTarget)
  );
  const onPointerMove = (event: PointerEvent) => {
    getPointerWorld(event);
  };
  const onPointerLeave = () => {
    pointerTarget.set(0, 0);
    pointerWorld.set(100, 100, 0);
  };

  const fireworks: Array<{
    points: THREE.Points;
    velocities: Float32Array;
    life: number;
    duration: number;
    delay: number;
  }> = [];
  const fireworkPalette = [0x62e9ff, 0xffd75e, 0xc47cff, 0xff6ea9, 0x7dffba];
  const spawnFirework = (center: THREE.Vector3, burstIndex: number, spread = 1) => {
    const origin = center.clone();
    origin.x += (Math.random() - 0.5) * 2.4 * spread;
    origin.y += (Math.random() - 0.5) * 1.6 * spread;
    origin.z += (Math.random() - 0.5) * 0.7 * spread;
    const count = 72 + Math.floor(Math.random() * 30);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const burstColor = new THREE.Color(fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)]);
    const accentColor = new THREE.Color(0xffffff);
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] = origin.x;
      positions[offset + 1] = origin.y;
      positions[offset + 2] = origin.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      velocities[offset] = Math.cos(angle) * speed;
      velocities[offset + 1] = Math.sin(angle) * speed + 0.55;
      velocities[offset + 2] = (Math.random() - 0.5) * speed * 0.9;
      const color = Math.random() < 0.22 ? accentColor : burstColor;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.065 + Math.random() * 0.025,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    scene.add(points);
    const duration = 1.35 + Math.random() * 0.45;
    fireworks.push({
      points,
      velocities,
      life: duration,
      duration,
      delay: burstIndex * 0.045 + Math.random() * 0.06,
    });
  };
  const onPointerDown = (event: PointerEvent) => {
    const origin = getPointerWorld(event);
    if (!origin) return;
    const burstCount = 5 + Math.floor(Math.random() * 2);
    for (let index = 0; index < burstCount; index += 1) {
      spawnFirework(origin, index);
    }
  };
  const autoPointer = new THREE.Vector2();
  const autoOrigin = new THREE.Vector3();
  let autoEdge = 0;
  let autoFireworkCountdown = 1;
  const spawnAutoFirework = () => {
    for (let burstIndex = 0; burstIndex < 6; burstIndex += 1) {
      const edge = (autoEdge + burstIndex) % 4;
      const along = 0.1 + Math.random() * 0.8;
      let clientX = 0;
      let clientY = 0;
      if (edge === 0) {
        clientX = window.innerWidth * along;
        clientY = window.innerHeight * (0.1 + Math.random() * 0.08);
      } else if (edge === 1) {
        clientX = window.innerWidth * (0.86 + Math.random() * 0.06);
        clientY = window.innerHeight * along;
      } else if (edge === 2) {
        clientX = window.innerWidth * along;
        clientY = window.innerHeight * (0.78 + Math.random() * 0.1);
      } else {
        clientX = window.innerWidth * (0.08 + Math.random() * 0.06);
        clientY = window.innerHeight * along;
      }
      const origin = screenToWorld(clientX, clientY, autoOrigin, autoPointer);
      if (origin) {
        spawnFirework(origin, burstIndex, 0.3);
      }
    }
    autoEdge = (autoEdge + 1) % 4;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement!);
  resize();

  const clock = new THREE.Clock();
  let animationFrame = 0;
  const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.033);
    const time = clock.elapsedTime;
    const starAttribute = starGeometry.getAttribute('position') as THREE.BufferAttribute;
    const animatedStarPositions = starAttribute.array as Float32Array;
    for (let index = 0; index < starCount; index += 1) {
      const offset = index * 3;
      const baseX = starBasePositions[offset];
      const baseY = starBasePositions[offset + 1];
      const dx = baseX - pointerWorld.x;
      const dy = baseY - pointerWorld.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const force = distance < 1.8 ? Math.pow(1 - distance / 1.8, 2) * 0.55 : 0;
      const normalX = distance > 0.001 ? dx / distance : 0;
      const normalY = distance > 0.001 ? dy / distance : 0;
      animatedStarPositions[offset] = baseX + Math.sin(time * 0.22 + starPhases[index]) * 0.055 + normalX * force;
      animatedStarPositions[offset + 1] = baseY + Math.cos(time * 0.18 + starPhases[index]) * 0.045 + normalY * force;
      animatedStarPositions[offset + 2] = starBasePositions[offset + 2] + Math.sin(time * 0.15 + starPhases[index]) * 0.08;
    }
    starAttribute.needsUpdate = true;
    camera.position.x += (pointerTarget.x * 0.34 - camera.position.x) * Math.min(1, delta * 3.2);
    camera.position.y += (pointerTarget.y * 0.24 - camera.position.y) * Math.min(1, delta * 3.2);
    camera.lookAt(0, 0, -0.8);

    autoFireworkCountdown -= delta;
    if (autoFireworkCountdown <= 0) {
      spawnAutoFirework();
      autoFireworkCountdown = 1;
    }

    for (let index = fireworks.length - 1; index >= 0; index -= 1) {
      const firework = fireworks[index];
      if (firework.delay > 0) {
        firework.delay -= delta;
        continue;
      }
      firework.points.visible = true;
      const attribute = firework.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = attribute.array as Float32Array;
      for (let particle = 0; particle < firework.velocities.length / 3; particle += 1) {
        const offset = particle * 3;
        const damping = Math.pow(0.985, delta * 60);
        firework.velocities[offset] *= damping;
        firework.velocities[offset + 1] = firework.velocities[offset + 1] * damping - 1.65 * delta;
        firework.velocities[offset + 2] *= damping;
        positions[offset] += firework.velocities[offset] * delta;
        positions[offset + 1] += firework.velocities[offset + 1] * delta;
        positions[offset + 2] += firework.velocities[offset + 2] * delta;
      }
      attribute.needsUpdate = true;
      firework.life -= delta;
      (firework.points.material as THREE.PointsMaterial).opacity = Math.max(0, firework.life / firework.duration);
      if (firework.life <= 0) {
        scene.remove(firework.points);
        firework.points.geometry.dispose();
        (firework.points.material as THREE.Material).dispose();
        fireworks.splice(index, 1);
      }
    }
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerleave', onPointerLeave);
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          const spriteMaterial = material as THREE.SpriteMaterial;
          spriteMaterial.map?.dispose();
          material.dispose();
        });
      }
    });
    renderer.dispose();
  };
}

onMounted(() => {
  if (loginThreeCanvas.value) {
    loginThreeCleanup = initLoginThree(loginThreeCanvas.value);
  }
  playLoginDj();
  window.addEventListener('pointerdown', playLoginDj, { once: true });
});

function startCountdown() {
  countdown.value = 60;
  countdownTimer = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0 && countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

/** 直接发短信验证码（接口不再需要极验参数） */
async function handleSendCode() {
  if (countdown.value > 0 || sending.value) {
    return;
  }
  if (!canSend.value) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please enter a valid mobile number'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
    return;
  }
  sending.value = true;
  try {
    await sendVerifyCode({ mobile: mobile.value.trim() });
    TUIMessageBox({
      title: t('Note'),
      message: t('Code sent'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
    startCountdown();
  } catch (error: any) {
    logger.warn('[Login] send verify code failed:', error);
    TUIMessageBox({
      title: t('Note'),
      message: error?.message || t('get SMS code failed!'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
  } finally {
    sending.value = false;
  }
}

async function handleLogin() {
  if (isLoggingIn.value) {
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(mobile.value)) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please enter a valid mobile number'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
    return;
  }
  if (!/^\d{4,6}$/.test(verifyCode.value)) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please enter the verification code!'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
    return;
  }

  isLoggingIn.value = true;
  try {
    const result = await codeLogin(mobile.value.trim(), verifyCode.value.trim());

    // 打印完整响应，便于确认后端返回字段
    logger.log('[Login] login response:', result);

    const userId = String(result.user_id);

    // SDKAppID：优先用后端下发的，其次用本地配置
    const sdkAppId = Number(
      result.sdk_app_id
      || result.trtc_sdk_app_id
      || result.sdkAppId
      || NIKO_CONFIG.sdkAppId,
    );

    // UserSig：优先用 TRTC 专用签名，其次用通用 sign
    const userSig = result.rtc_sign || result.trtc_sign || result.sign;

    logger.log('[Login] using credentials:', { sdkAppId, userId, userSigLen: userSig?.length });

    if (!sdkAppId || !userSig) {
      throw new Error('登录响应缺少 SDKAppID 或 userSig，请检查后端返回');
    }

    // 持久化后端登录态（token + 用户信息）
    authStore.setSession(result.token, {
      userId,
      userShowId: String(result.user_show_id),
      nickname: result.nickname,
      avatar: result.avatar,
      userSig,
      fansCount: Number(result.fans_count || 0),
    });

    // Electron 应用登录凭据（供 TRTC 登录使用）
    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify({
      sdkAppId,
      userId,
      userSig,
      loginType: LoginType.UserSig,
    }));

    // 登录成功后拉取用户个人信息（is_anchor 决定是否展示开播入口，organization_info 供公会页使用）
    authStore.loadPersonalInfo(true).catch((error) => {
      logger.warn('[Login] load personal info failed:', error);
    });

    window.localStorage.setItem(MOBILE_STORAGE_KEY, mobile.value);
    verifyCode.value = '';
    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdown.value = 0;

    await gotoNextPage();
  } catch (error: any) {
    logger.warn('[Login] code login failed:', error);
    TUIMessageBox({
      title: t('Note'),
      message: error?.message || t('Login failed.'),
      confirmButtonText: t('Sure'),
      customClass: 'login-message-box',
    });
  } finally {
    isLoggingIn.value = false;
  }
}

async function gotoNextPage() {
  const winType = await getWindowType();
  logger.log(`Login success, go to ${winType} window page`);
  switch (winType) {
  case 'main':
    router.push({ name: 'loading' });
    break;
  case 'child':
    router.push({ name: 'tui-live-kit-child' });
    break;
  case 'cover':
    router.push({ name: 'tui-live-kit-cover' });
    break;
  default:
    logger.warn('login success, unknown window source:', winType);
    break;
  }
  window.ipcRenderer.send('user-login');
}

onBeforeUnmount(() => {
  loginThreeCleanup?.();
  loginThreeCleanup = null;
  window.removeEventListener('pointerdown', playLoginDj);
  loginDjAudio.value?.pause();
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});

const isMaximized: Ref<boolean> = ref(false);
function onMinimize() {
  logger.log('[LiveHeader]onMinimize');
  window.ipcRenderer.send('on-minimize-window', null);
}

function onToggleMaximize() {
  logger.log('[LiveHeader]onToggleMaximize');
  isMaximized.value = !isMaximized.value;
  window.ipcRenderer.send('on-maximize-window', isMaximized.value);
}

function onClose() {
  // ★ 直接发 IPC → main.js 统一弹独立 confirm BrowserWindow（openAppQuitConfirmDialog）
  // 所有页面的关闭确认由 main 进程统一处理，避免页面自己弹 TUIMessageBox
  window.ipcRenderer.send('on-close-window', null);
}
</script>

<style lang="scss">
@import '../../TUILiveKit/assets/variable.scss';

.tui-login-page {
  --font-size-primary: 1rem;
  --font-size-secondary: 0.75rem;
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: #0b0d12;

  .tui-login-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: #030718;
  }

  .tui-login-bg-video {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.72) saturate(1.25) contrast(1.08);
  }

  .tui-login-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(2, 4, 18, 0.06) 0%, rgba(2, 4, 18, 0.12) 45%, rgba(2, 4, 18, 0.62) 100%),
      linear-gradient(180deg, rgba(2, 4, 18, 0.22) 0%, transparent 28%, rgba(2, 4, 18, 0.2) 100%);
  }

  .tui-login-bg-three {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .tui-login-header,
  .tui-login-body {
    position: relative;
    z-index: 1;
  }

  .tui-input-icon {
    flex: 0 0 1.25rem;
    width: 1.25rem;
    height: 1.25rem;
  }

  .tui-login-header {
    height: 2.75rem;
    .window-tool{
      display: flex;
      align-items: center;
      justify-content: flex-end;
      align-self: flex-end;
      width:100%;
      padding: 0.5rem;
    }
  }

  .tui-login-body {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: calc(100% - 2.75rem);
    padding-right: 5rem;
  }

  .tui-login-card {
    width: 26rem;
    border-radius: 1rem;
    padding: 2.5rem 2.25rem;
    background: rgba(20, 22, 30, 0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }

  .tui-login-card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.75rem;
  }

  .tui-login-logo-img {
    width: 2.25rem;
    height: 2.25rem;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  .tui-login-title-text {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.05em;
  }

  .tui-login-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;

    &:first-of-type {
      margin-top: 0;
    }
  }

  .tui-field-label {
    font-size: var(--font-size-secondary);
    color: #b3b8c8;
  }

  .tui-login-option-input {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-radius: 0.5rem;
    background-color: #292d38;
    font-size: var(--font-size-primary);

    input.tui-field-input {
      -webkit-appearance: none;
      flex: 1 1 auto;
      width: auto;
      line-height: 3.125rem;
      border: 1px solid #292D38;
      background-color: #292d38;
      color: #b3b8c8;
      font-size: var(--font-size-primary);
      outline: none;

      &::placeholder {
        color: #6b7280;
      }
    }

    .tui-area-code {
      flex: 0 0 auto;
      padding-right: 0.75rem;
      color: #b3b8c8;
      font-weight: 600;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      margin-right: 0.75rem;
    }

    .tui-msg-control {
      flex: 0 0 auto;
      padding-left: 0.75rem;
      margin-left: 0.75rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      color: #1c66e5;
      background: transparent;
      border-top: none;
      border-right: none;
      border-bottom: none;
      white-space: nowrap;

      &:disabled {
        cursor: not-allowed;
        .tui-msg-sent {
          color: #cccccc;
        }
      }
    }

    .tui-msg-sent {
      color: #cccccc;
    }
  }

  .tui-login-button {
    width: 100%;
    height: 3rem;
    margin-top: 1.5rem;
    border: 1px solid $color-primary;
    border-radius: 0.5rem;
    background-color: $color-primary;
    cursor: pointer;
    color: #D5E0F2;
  }

  .tui-button-ripple {
    background-position: center;
    transition: background 500ms ease-in-out;

    &:hover {
      background-position: center;
      background-color: $color-anchor-hover;
      background-image: radial-gradient(circle, transparent 1%, $color-anchor-hover 1%);
      background-size: 15000%;
    }

    &:active {
      background-color: $color-anchor-active;
      background-size: 100%;
      transition: background 0s;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>

<style lang="scss">
.login-message-box .tui-message-confirm-button.tui-live-button-primary {
  background: #1677ff !important;
  border: 1px solid #1677ff !important;

  &:hover {
    background: #4096ff !important;
  }
}
</style>

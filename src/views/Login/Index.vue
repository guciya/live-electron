<template>
  <UIKitProvider theme="dark">
    <div class="tui-login-page">
    <video class="tui-login-bg-video" :src="loginBgVideo" autoplay loop muted playsinline></video>
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
import { computed, onBeforeUnmount, ref, Ref } from 'vue';
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
import loginBgVideo from '../../assets/niko-live-video.mp4';

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
    });
    startCountdown();
  } catch (error: any) {
    logger.warn('[Login] send verify code failed:', error);
    TUIMessageBox({
      title: t('Note'),
      message: error?.message || t('get SMS code failed!'),
      confirmButtonText: t('Sure'),
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
    });
    return;
  }
  if (!/^\d{4,6}$/.test(verifyCode.value)) {
    TUIMessageBox({
      title: t('Note'),
      message: t('Please enter the verification code!'),
      confirmButtonText: t('Sure'),
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

  .tui-login-bg-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
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

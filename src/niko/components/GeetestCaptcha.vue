<template>
  <div class="captcha-container">
    <div ref="captchaRef" class="captcha"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { GeetestConfig, GeetestInstance, GeetestValidateData } from '../types/geetest';

interface Props {
  captchaId: string;
  product?: 'popup' | 'bind' | 'float';
  protocol?: 'http' | 'https';
  language?: string;
  timeout?: number;
}

interface Emits {
  (e: 'success', data: GeetestValidateData): void;
  (e: 'error', error: unknown): void;
  (e: 'ready'): void;
}

const props = withDefaults(defineProps<Props>(), {
  product: 'bind',
  protocol: 'https',
  language: 'zh-CN',
  timeout: 10000,
});

const emit = defineEmits<Emits>();

const captchaRef = ref<HTMLElement | null>(null);
const captchaObj = ref<GeetestInstance | null>(null);
const isInitialized = ref(false);
let initRetryTimer: number | null = null;

/**
 * 等待 window.initGeetest4 出现后初始化。
 * index.html 里 gt4.js 是 async 异步加载的，组件 mount 时很可能还没就绪，
 * 直接调 initCaptcha 会发现 initGeetest4 = undefined 而永久失败。
 * 这里做最多 20 次 / 每 250ms 的轮询，覆盖 SDK 加载延迟。
 */
function waitSdkReady(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.initGeetest4 !== 'undefined') {
      resolve();
      return;
    }
    const started = Date.now();
    const tick = () => {
      if (typeof window.initGeetest4 !== 'undefined') {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('极验 gt4.js 加载超时，请检查网络'));
        return;
      }
      initRetryTimer = window.setTimeout(tick, 250);
    };
    tick();
  });
}

const initCaptcha = async (): Promise<void> => {
  try {
    await waitSdkReady(props.timeout);
  } catch (err) {
    console.error('[Geetest] initCaptcha failed:', err);
    emit('error', err);
    return;
  }

  if (captchaObj.value) {
    // 已初始化则先销毁旧实例
    captchaObj.value.destroy();
    captchaObj.value = null;
    isInitialized.value = false;
  }

  const config: GeetestConfig = {
    captchaId: props.captchaId,
    product: props.product,
  };

  window.initGeetest4(config, (handler: GeetestInstance) => {
    console.log('[Geetest] init callback fired, handler:', !!handler);
    captchaObj.value = handler;

    if (captchaRef.value) {
      handler.appendTo(captchaRef.value);
    }

    handler
      .onReady(() => {
        console.log('[Geetest] onReady');
        isInitialized.value = true;
        emit('ready');
      })
      .onSuccess(() => {
        console.log('[Geetest] onSuccess');
        const validateData = handler.getValidate();
        emit('success', validateData);
      })
      .onError((e: unknown) => {
        console.warn('[Geetest] onError:', e);
        emit('error', e);
      });
  });
};

const resetCaptcha = (): void => {
  captchaObj.value?.reset();
};

const showCaptcha = (): void => {
  if (captchaObj.value) {
    captchaObj.value.showCaptcha();
    return;
  }
  // SDK 还没初始化好：等 SDK 就绪 + init 完成再 show
  void initCaptcha().then(() => {
    captchaObj.value?.showCaptcha();
  });
};

const destroyCaptcha = (): void => {
  captchaObj.value?.destroy();
  captchaObj.value = null;
  isInitialized.value = false;
};

onMounted(() => {
  void initCaptcha();
});

onBeforeUnmount(() => {
  if (initRetryTimer !== null) {
    window.clearTimeout(initRetryTimer);
    initRetryTimer = null;
  }
  destroyCaptcha();
});

watch(() => props.captchaId, () => {
  destroyCaptcha();
  initCaptcha();
});

defineExpose({
  resetCaptcha,
  showCaptcha,
  destroyCaptcha,
  isInitialized: () => isInitialized.value,
});
</script>

<style scoped>
.captcha-container {
  margin: 10px 0;
}
</style>

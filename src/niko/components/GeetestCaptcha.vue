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

const initCaptcha = (): void => {
  if (typeof window.initGeetest4 === 'undefined') {
    console.error('[Geetest] gt4.js 未加载，请检查网络或 index.html 引入');
    return;
  }

  const config: GeetestConfig = {
    captchaId: props.captchaId,
    product: props.product,
  };

  window.initGeetest4(config, (handler: GeetestInstance) => {
    captchaObj.value = handler;

    if (captchaRef.value) {
      handler.appendTo(captchaRef.value);
    }

    handler
      .onReady(() => {
        isInitialized.value = true;
        emit('ready');
      })
      .onSuccess(() => {
        const validateData = handler.getValidate();
        emit('success', validateData);
      })
      .onError((e: unknown) => {
        emit('error', e);
      });
  });
};

const resetCaptcha = (): void => {
  captchaObj.value?.reset();
};

const showCaptcha = (): void => {
  if (!isInitialized.value) {
    console.warn('[Geetest] 验证码尚未初始化完成');
    return;
  }
  captchaObj.value?.showCaptcha();
};

const destroyCaptcha = (): void => {
  captchaObj.value?.destroy();
  captchaObj.value = null;
  isInitialized.value = false;
};

onMounted(() => {
  initCaptcha();
});

onBeforeUnmount(() => {
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

<template>
  <TUIDialog
    :visible="visible"
    title="充值中心"
    :width="'560px'"
    :show-close="true"
    :cancel-text="'关闭'"
    :confirm-text="'立即支付'"
    :confirm-disabled="!selectedOption"
    @update:visible="(val: boolean) => emit('update:visible', val)"
    @confirm="handlePay"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <div class="recharge-content">
      <!-- 用户信息 -->
      <div class="user-info">
        <Avatar :src="avatar" :size="48" />
        <div class="info">
          <div class="nickname">{{ nickname }}</div>
          <div class="balance">
            当前钻石：<span class="amount">{{ coin }}</span>
          </div>
        </div>
      </div>

      <!-- 充值金额选择 -->
      <div class="section">
        <div class="section-title">充值金额</div>
        <div class="amount-grid">
          <div
            v-for="item in rechargeOptions"
            :key="item.diamonds"
            class="amount-item"
            :class="{ active: selectedOption?.diamonds === item.diamonds }"
            @click="selectedOption = item"
          >
            <div class="diamonds">
              <span class="diamond-icon">💎</span>
              {{ item.diamonds }}
            </div>
            <div class="price">¥{{ item.price.toFixed(2) }}</div>
          </div>
        </div>
      </div>

      <!-- 支付方式 -->
      <div class="section">
        <div class="section-title">支付方式</div>
        <div class="payment-methods">
          <div
            class="payment-method"
            :class="{ active: payMethod === 'alipay' }"
            @click="payMethod = 'alipay'"
          >
            <span class="pay-icon alipay">支</span>
            <span>支付宝</span>
          </div>
          <div
            class="payment-method"
            :class="{ active: payMethod === 'wechat' }"
            @click="payMethod = 'wechat'"
          >
            <span class="pay-icon wechat">微</span>
            <span>微信支付</span>
          </div>
        </div>
      </div>

      <!-- 应付金额 -->
      <div class="action-row">
        <div class="total-amount">
          应付金额：<span class="price">¥{{ selectedOption ? (selectedOption.price).toFixed(2) : '0.00' }}</span>
        </div>
      </div>

      <!-- 温馨提示 -->
      <div class="tips">
        <div class="tip-title">温馨提示：</div>
        <ul>
          <li>充值比例：1元 = 100钻石</li>
          <li>充值金额仅用于平台消费，不支持提现</li>
          <li>如遇到充值问题，请联系客服</li>
        </ul>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TUIDialog } from '@tencentcloud/uikit-base-component-vue3';
import { Avatar } from 'tuikit-atomicx-vue3-electron';
import { useAuthStore } from '../../../niko/store/auth';
import { showMessage, MessageToastType } from '../../base-component/MessageToast';

interface RechargeOption {
  diamonds: number;
  price: number;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const authStore = useAuthStore();

// 充值选项（与 web 端保持一致）
const rechargeOptions: RechargeOption[] = [
  { diamonds: 600, price: 6 },
  { diamonds: 3000, price: 30 },
  { diamonds: 10000, price: 100 },
  { diamonds: 59800, price: 598 },
  { diamonds: 159800, price: 1598 },
  { diamonds: 298000, price: 2980 },
];

const selectedOption = ref<RechargeOption | null>(rechargeOptions[0]);
const payMethod = ref<'alipay' | 'wechat'>('alipay');

const nickname = computed(() => {
  return authStore.personalInfo?.nickname || authStore.userInfo?.nickname || '用户';
});
const avatar = computed(() => {
  return authStore.personalInfo?.avatar || authStore.userInfo?.avatar || '';
});
const coin = computed(() => {
  return authStore.personalInfo?.coin ?? 0;
});

// 弹窗打开时刷新个人信息（拿到最新钻石余额）
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      selectedOption.value = rechargeOptions[0];
      payMethod.value = 'alipay';
      try {
        await authStore.loadPersonalInfo(true);
      } catch (e) {
        // 忽略刷新失败，用缓存数据展示
      }
    }
  },
);

function handlePay() {
  if (!selectedOption.value) {
    showMessage({ type: MessageToastType.Warning, message: '请选择充值金额' });
    return;
  }
  // TODO: 对接后端支付接口，目前仅展示确认提示
  showMessage({
    type: MessageToastType.Info,
    message: `即将通过${payMethod.value === 'alipay' ? '支付宝' : '微信'}支付 ¥${selectedOption.value.price.toFixed(2)}，支付接口待接入`,
  });
  emit('update:visible', false);
}

function handleCancel() {
  emit('update:visible', false);
}
</script>

<style lang="scss" scoped>
.recharge-content {
  padding: 4px 0;

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    .info {
      .nickname {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-color-primary, #fff);
      }

      .balance {
        font-size: 13px;
        color: var(--text-color-secondary, #aaa);

        .amount {
          color: #ff6b6b;
          font-weight: 600;
        }
      }
    }
  }

  .section {
    margin-top: 18px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-color-primary, #fff);
  }

  .amount-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    .amount-item {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 14px 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #ff6b6b;
      }

      &.active {
        border-color: #ff6b6b;
        background: rgba(255, 107, 107, 0.1);
      }

      .diamonds {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--text-color-primary, #fff);

        .diamond-icon {
          margin-right: 2px;
        }
      }

      .price {
        color: #ff6b6b;
        font-weight: 600;
        font-size: 13px;
      }
    }
  }

  .payment-methods {
    display: flex;
    gap: 12px;

    .payment-method {
      flex: 1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-color-primary, #fff);

      &:hover {
        border-color: #ff6b6b;
      }

      &.active {
        border-color: #ff6b6b;
        background: rgba(255, 107, 107, 0.1);
      }

      .pay-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;

        &.alipay {
          background: #1677ff;
        }

        &.wechat {
          background: #07c160;
        }
      }
    }
  }

  .action-row {
    margin-top: 18px;
    padding: 12px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .total-amount {
      font-size: 14px;
      color: var(--text-color-primary, #fff);

      .price {
        color: #ff6b6b;
        font-size: 22px;
        font-weight: 700;
      }
    }
  }

  .tips {
    margin-top: 14px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;

    .tip-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--text-color-primary, #fff);
    }

    ul {
      color: var(--text-color-secondary, #aaa);
      padding-left: 18px;
      margin: 0;
      font-size: 12px;

      li {
        margin-bottom: 3px;
      }
    }
  }
}
</style>

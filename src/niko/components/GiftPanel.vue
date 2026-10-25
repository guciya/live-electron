<template>
  <div v-if="visible" class="gift-mask" @click="emit('close')">
    <div class="gift-panel" @click.stop>
      <div class="gift-panel-header">
        <span class="gift-panel-title">礼物</span>
        <button class="gift-panel-close" type="button" aria-label="关闭" @click="emit('close')">
          ✕
        </button>
      </div>

      <div class="gift-tabs">
        <span
          v-for="cat in categories"
          :key="cat.id"
          class="gift-tab"
          :class="{ active: activeKey === String(cat.id) }"
          @click="selectCategory(String(cat.id))"
        >{{ cat.name || '礼物' }}</span>
        <span
          class="gift-tab"
          :class="{ active: activeKey === 'backpack' }"
          @click="selectCategory('backpack')"
        >背包</span>
      </div>

      <div class="gift-grid">
        <div v-if="loading" class="gift-hint">加载中...</div>
        <div v-else-if="!gifts.length" class="gift-hint">
          {{ activeKey === 'backpack' ? '背包里还没有礼物' : '暂无礼物' }}
        </div>
        <div
          v-for="gift in gifts"
          :key="gift.id"
          class="gift-cell"
          :class="{ active: String(selectedGiftId) === String(gift.id) }"
          @click="selectedGiftId = gift.id"
        >
          <span v-if="String(selectedGiftId) === String(gift.id)" class="gift-cell-check">✓</span>
          <img
            v-if="gift.gift_image"
            class="gift-cell-icon"
            :src="resolveImageUrl(gift.gift_image)"
            alt=""
            @error="hideBrokenGiftIcon"
          />
          <span v-else class="gift-cell-icon gift-cell-icon-empty">礼</span>
          <span class="gift-cell-name">{{ gift.gift_name || '礼物' }}</span>
          <span v-if="activeKey === 'backpack'" class="gift-cell-price">
            剩余 {{ gift.gift_count ?? 0 }}
          </span>
          <span v-else class="gift-cell-price">钻石 {{ gift.gift_price ?? 0 }}</span>
        </div>
      </div>

      <div class="gift-panel-footer">
        <div class="gift-selected">
          <img
            v-if="selectedGift?.gift_image"
            class="gift-selected-icon"
            :src="resolveImageUrl(selectedGift.gift_image)"
            alt=""
          />
          <span v-else class="gift-selected-icon gift-selected-icon-empty">礼</span>
          <div class="gift-selected-info">
            <span class="gift-selected-name">
              {{ selectedGift ? selectedGift.gift_name : '请选择礼物' }}
            </span>
            <span v-if="selectedGift" class="gift-selected-price">
              {{ activeKey === 'backpack' ? `剩余 ${selectedGift.gift_count ?? 0}` : `钻石 ${selectedGift.gift_price ?? 0}` }}
            </span>
          </div>
        </div>
        <button
          class="gift-send-btn"
          type="button"
          :disabled="!selectedGift || sending"
          @click="handleSend"
        >
          {{ sending ? '赠送中...' : '赠送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TUIToast } from '@tencentcloud/uikit-base-component-vue3';
import {
  getBackpackGiftList,
  getGiftCategory,
  getLiveGiftList,
  sendLiveBackpackGift,
  sendLiveGift,
  type GiftCategory,
  type GiftItem,
} from '../api/live';
import { resolveImageUrl } from '../config';

const props = defineProps<{
  visible: boolean;
  liveIndexId: string | number;
}>();

const emit = defineEmits<{ close: [] }>();

const categories = ref<GiftCategory[]>([]);
const activeKey = ref('');
const gifts = ref<GiftItem[]>([]);
const selectedGiftId = ref<string | number>('');
const loading = ref(false);
const sending = ref(false);

const selectedGift = computed(
  () => gifts.value.find((gift) => String(gift.id) === String(selectedGiftId.value)) || null,
);

/** 分类接口在不同版本返回 { categories } 或直接数组，两种都兼容 */
function normalizeCategories(data: any): GiftCategory[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data?.categories ?? [];
}

async function loadGifts() {
  loading.value = true;
  selectedGiftId.value = '';
  try {
    if (activeKey.value === 'backpack') {
      const data = await getBackpackGiftList();
      gifts.value = data?.gift_list ?? [];
    } else {
      const data = await getLiveGiftList(activeKey.value);
      gifts.value = data?.gift_list ?? [];
    }
  } catch (error: any) {
    console.warn('[GiftPanel] load gifts failed:', error?.message || error);
    gifts.value = [];
    TUIToast.error({ message: error?.message || '礼物加载失败' });
  } finally {
    loading.value = false;
  }
}

async function init() {
  try {
    categories.value = normalizeCategories(await getGiftCategory())
      .filter((cat) => !String(cat.name || '').includes('定制'));
  } catch (error) {
    console.warn('[GiftPanel] getGiftCategory failed:', error);
    categories.value = [];
  }
  if (!activeKey.value || (activeKey.value !== 'backpack' && !categories.value.some((cat) => String(cat.id) === activeKey.value))) {
    activeKey.value = categories.value[0] ? String(categories.value[0].id) : 'backpack';
  }
  await loadGifts();
}

function selectCategory(key: string) {
  if (activeKey.value === key) {
    return;
  }
  activeKey.value = key;
  void loadGifts();
}

function hideBrokenGiftIcon(event: Event) {
  const img = event.target as HTMLImageElement | null;
  if (img) {
    img.style.visibility = 'hidden';
  }
}

async function handleSend() {
  const gift = selectedGift.value;
  if (!gift) {
    TUIToast.warning({ message: '请选择礼物' });
    return;
  }
  if (!props.liveIndexId) {
    TUIToast.warning({ message: '直播间信息缺失' });
    return;
  }
  sending.value = true;
  try {
    const payload = {
      liveIndexId: props.liveIndexId,
      giftId: gift.id,
      giftCount: 1,
      effectUrl: gift.effect_url,
    };
    if (activeKey.value === 'backpack') {
      await sendLiveBackpackGift(payload);
    } else {
      await sendLiveGift(payload);
    }
    TUIToast.success({ message: '赠送成功' });
    emit('close');
  } catch (error: any) {
    console.warn('[GiftPanel] send gift failed:', error?.message || error);
    TUIToast.error({ message: error?.message || '赠送失败' });
  } finally {
    sending.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void init();
    }
  },
);
</script>

<style lang="scss" scoped>
.gift-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  background: radial-gradient(120% 120% at 100% 50%, rgba(43, 127, 255, 0.16), rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(2px);
}

.gift-panel {
  width: 23.5rem;
  max-height: 88%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  border-radius: 1rem;
  background: linear-gradient(180deg, #26232b 0%, #19181d 100%);
  border: 1px solid rgba(96, 165, 250, 0.22);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.02) inset;
}

.gift-panel-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem 0.625rem;
  background: linear-gradient(90deg, rgba(43, 127, 255, 0.16), rgba(43, 127, 255, 0.06) 55%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .gift-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.02em;

    &::before {
      content: '';
      width: 0.25rem;
      height: 1rem;
      border-radius: 2px;
      background: linear-gradient(180deg, #6db3ff, #2b7fff);
      box-shadow: 0 0 10px rgba(43, 127, 255, 0.55);
    }
  }

  .gift-panel-close {
    width: 1.625rem;
    height: 1.625rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    border: none;
    border-radius: 50%;
    font-size: 0.75rem;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.14);
    }
  }
}

.gift-tabs {
  flex: none;
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .gift-tab {
    flex: none;
    padding: 0.3125rem 0.8125rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    border-radius: 0.875rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;

    &:hover {
      color: rgba(255, 255, 255, 0.85);
      background: rgba(255, 255, 255, 0.1);
    }

    &.active {
      color: #cfe5ff;
      background: linear-gradient(135deg, rgba(43, 127, 255, 0.28), rgba(43, 127, 255, 0.16));
      border-color: rgba(96, 165, 250, 0.5);
      box-shadow: 0 4px 14px rgba(43, 127, 255, 0.18);
    }
  }
}

.gift-grid {
  flex: 1;
  min-height: 8rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-content: start;
  gap: 0.625rem;
  padding: 0.25rem 1rem 0.875rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
  }

  .gift-hint {
    grid-column: 1 / -1;
    padding: 2.25rem 0;
    font-size: 0.75rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
  }

  .gift-cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 0.375rem;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.035);
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
      transform: translateY(-1px);
    }

    &.active {
      border-color: rgba(96, 165, 250, 0.85);
      background: linear-gradient(180deg, rgba(43, 127, 255, 0.22), rgba(43, 127, 255, 0.1));
      box-shadow: 0 6px 18px rgba(43, 127, 255, 0.2), 0 0 0 1px rgba(96, 165, 250, 0.35) inset;
    }
  }

  .gift-cell-check {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1rem;
    height: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    color: #fff;
    border-radius: 50%;
    background: linear-gradient(135deg, #6db3ff, #2b7fff);
    box-shadow: 0 2px 6px rgba(43, 127, 255, 0.4);
  }

  .gift-cell-icon {
    width: 3.25rem;
    height: 3.25rem;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
  }

  .gift-cell-icon-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  .gift-cell-name {
    max-width: 100%;
    font-size: 0.75rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gift-cell-price {
    font-size: 0.6875rem;
    color: #8fc1ff;
  }
}

.gift-panel-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(0, 0, 0, 0.18);

  .gift-selected {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gift-selected-icon {
    flex: none;
    width: 2.25rem;
    height: 2.25rem;
    object-fit: contain;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.06);
  }

  .gift-selected-icon-empty {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .gift-selected-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .gift-selected-name {
    min-width: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gift-selected-price {
    font-size: 0.6875rem;
    color: #8fc1ff;
  }

  .gift-send-btn {
    flex: none;
    height: 2.125rem;
    padding: 0 1.5rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    border: none;
    border-radius: 1.0625rem;
    /* 与聊天发送按钮同色（主题蓝） */
    background: var(--uikit-color-primary, #2b7fff);
    box-shadow: 0 6px 16px rgba(43, 127, 255, 0.35);
    transition: filter 0.15s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }
  }
}
</style>

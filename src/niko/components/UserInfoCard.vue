<template>
  <div v-if="visible" class="niko-user-card-mask" @click="emit('close')">
    <div class="niko-user-card" @click.stop>
      <!-- 头部：businessCardImage 做整张背景图（跟 web-obs-live 一致） -->
      <div
        class="niko-user-card-header"
        :style="headerBgStyle"
      >
        <div class="niko-user-card-avatar-wrap" :style="avatarRingStyle">
          <img class="niko-user-card-avatar" :src="avatar" alt="" />
          <img
            v-if="frameImage"
            class="niko-user-card-frame"
            :src="frameImage"
            alt=""
          />
        </div>
        <div class="niko-user-card-head">
          <div class="niko-user-card-name-row">
            <span class="niko-user-card-name">{{ info?.nickname || '用户' }}</span>
            <span v-if="genderText" class="niko-user-card-gender" :class="genderClass">
              {{ genderText }}
            </span>
          </div>
          <div class="niko-user-card-badges">
            <img v-if="vipIcon" class="niko-user-card-badge-img" :src="vipIcon" alt="" />
            <img v-if="levelIcon" class="niko-user-card-badge-img" :src="levelIcon" alt="" />
            <span v-if="info?.user_level_info?.level_name" class="niko-user-card-level-text">
              {{ info.user_level_info.level_name }}
            </span>
          </div>
        </div>
        <button class="niko-user-card-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </div>

      <div v-if="loading" class="niko-user-card-loading">加载中...</div>

      <template v-else-if="info">
        <!-- 签名 -->
        <div v-if="info.introduction" class="niko-user-card-signature">
          <span class="niko-user-card-signature-label">签名：</span>
          <span class="niko-user-card-signature-text">{{ info.introduction }}</span>
        </div>

        <!-- IP + NKO号 -->
        <div class="niko-user-card-address">
          <div class="niko-user-card-address-item">
            <span class="niko-user-card-address-label">IP位置：</span>
            <span class="niko-user-card-address-value">{{ info.user_location || '未知' }}</span>
          </div>
          <div class="niko-user-card-address-item">
            <span class="niko-user-card-address-label">NKO号：</span>
            <span class="niko-user-card-address-value">{{ info.user_show_id || '-' }}</span>
          </div>
        </div>

        <!-- 粉丝 / 贡献 统计条 -->
        <div class="niko-user-card-stats">
          <div class="niko-user-card-stat">
            <span class="niko-user-card-stat-num">{{ Number(info.fans_count || 0) }}</span>
            <span class="niko-user-card-stat-label">粉丝</span>
          </div>
          <div class="niko-user-card-stat-divider"></div>
          <div class="niko-user-card-stat">
            <span class="niko-user-card-stat-num">{{ Number(info.contribution || 0) }}</span>
            <span class="niko-user-card-stat-label">贡献</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { resolveImageUrl } from '../config';
import type { AudienceCardInfo } from '../api/live';

const props = defineProps<{
  visible: boolean;
  info: AudienceCardInfo | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const avatar = computed(() => resolveImageUrl(String(props.info?.avatar || '')));
const frameImage = computed(() => resolveImageUrl(String(props.info?.adorn?.frame?.frame_image || '')));
const levelIcon = computed(() => resolveImageUrl(String(
  props.info?.user_level_info?.level_card_icon
  || props.info?.user_level_info?.level_icon
  || '',
)));
const levelCardBg = computed(() => resolveImageUrl(String(
  props.info?.user_level_info?.level_card_bg
  || props.info?.user_level_info?.business_card_image
  || '',
)));
const levelCardColor = computed(() => String(
  props.info?.user_level_info?.level_color || '#4a90d9',
));

/** 头部背景：有 businessCardImage/levelCardBg 就用整张图，没有就用等级色渐变 */
const headerBgStyle = computed(() => {
  if (levelCardBg.value) {
    return {
      backgroundImage: `url(${levelCardBg.value})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    } as const;
  }
  // 无背景图时用等级色渐变兜底
  const color = levelCardColor.value;
  return {
    background: `linear-gradient(135deg, ${color}cc 0%, ${color}66 50%, #1a1a1a 100%)`,
  } as const;
});

/** 头像外圈：等级色光晕 */
const avatarRingStyle = computed(() => ({
  boxShadow: `0 0 0 2px rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.45), 0 0 20px ${levelCardColor.value}44`,
}));

const vipIcon = computed(() => resolveImageUrl(String(props.info?.vip_info?.vip_icon || '')));
const genderText = computed(() => {
  const age = props.info?.age || 0;
  const gender = Number(props.info?.gender ?? -1);
  if (gender === 1) return `男 ${age}`;
  if (gender === 0) return `女 ${age}`;
  return '';
});
const genderClass = computed(() => (Number(props.info?.gender) === 1 ? 'is-male' : 'is-female'));
</script>

<style scoped>
/* ===== 遮罩 ===== */
.niko-user-card-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
}

/* ===== 卡片容器 ===== */
.niko-user-card {
  width: 380px;
  background: linear-gradient(180deg, #1e1e2e 0%, #1a1a1a 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  padding: 0 18px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55), 0 0 80px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  color: #fff;
}

/* ===== 头部 ===== */
.niko-user-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 22px 14px 14px;
  margin: -1px -18px 16px; /* 上负 margin 让头部溢出覆盖卡片圆角 */
  border-radius: 16px 16px 0 0;
  position: relative;
  background: linear-gradient(135deg, #4a90d9cc 0%, #2a529866 50%, #1a1a1a 100%);
}

.niko-user-card-header::after {
  /* 底部渐变遮罩，让头部背景图自然过渡到卡片正文 */
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(180deg, transparent, #1a1a1a);
  pointer-events: none;
}

/* 有背景图时加黑色渐变遮罩保证文字可读 */
.niko-user-card-header[style*="url"] {
  background-blend-mode: normal;
}

.niko-user-card-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 16px;
  line-height: 22px;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  background: rgba(0, 0, 0, 0.35);
  border: none;
  border-radius: 50%;
  transition: background-color .15s, color .15s;
  z-index: 3;
}
.niko-user-card-close:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
}

/* 头像 */
.niko-user-card-avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #2a2a2a;
  z-index: 2;
}

.niko-user-card-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.niko-user-card-frame {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  object-fit: contain;
  pointer-events: none;
}

/* 用户名 + 徽章 */
.niko-user-card-head {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
  z-index: 2;
}

.niko-user-card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.niko-user-card-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.niko-user-card-gender {
  flex: none;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 16px;
  color: #fff;
}
.niko-user-card-gender.is-male {
  background: linear-gradient(135deg, #62b5f1, #4a90e2);
}
.niko-user-card-gender.is-female {
  background: linear-gradient(135deg, #f569d6, #e84ba0);
}

.niko-user-card-badges {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.niko-user-card-badge-img {
  height: 18px;
  width: auto;
  display: block;
}

.niko-user-card-level-text {
  font-size: 12px;
  color: #ffd479;
  background: rgba(255, 196, 84, 0.18);
  border: 1px solid rgba(255, 196, 84, 0.3);
  padding: 1px 8px;
  border-radius: 10px;
  line-height: 16px;
}

/* ===== 加载 ===== */
.niko-user-card-loading {
  padding: 2rem 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
}

/* ===== 签名 ===== */
.niko-user-card-signature {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 10px;
  word-break: break-all;
}
.niko-user-card-signature-label {
  color: rgba(255, 255, 255, 0.45);
}

/* ===== IP + NKO ===== */
.niko-user-card-address {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 14px;
}
.niko-user-card-address-label {
  color: rgba(255, 255, 255, 0.4);
}
.niko-user-card-address-value {
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 统计条 ===== */
.niko-user-card-stats {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.niko-user-card-stat {
  flex: 1;
  text-align: center;
}

.niko-user-card-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.niko-user-card-stat-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.niko-user-card-stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}
</style>

<template>
  <div v-if="visible" class="niko-user-card-mask" @click="emit('close')">
    <div class="niko-user-card" @click.stop>
      <button class="niko-user-card-close" type="button" aria-label="关闭" @click="emit('close')">×</button>

      <div v-if="loading" class="niko-user-card-loading">加载中...</div>

      <template v-else-if="info">
        <div class="niko-user-card-header">
          <div class="niko-user-card-avatar-wrap">
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
              <span class="niko-user-card-name">{{ info.nickname || '用户' }}</span>
              <span v-if="genderText" class="niko-user-card-gender" :class="genderClass">
                {{ genderText }}
              </span>
            </div>
            <div class="niko-user-card-badges">
              <span v-if="info.vip_info?.vip_name" class="niko-user-card-vip">
                <img v-if="vipIcon" :src="vipIcon" alt="" />
                {{ info.vip_info.vip_name }}
              </span>
              <span v-if="levelIcon" class="niko-user-card-level">
                <img :src="levelIcon" alt="" />
                {{ info.user_level_info?.level_name || '' }}
              </span>
            </div>
          </div>
        </div>

        <div class="niko-user-card-signature">
          {{ info.introduction || '这个人很懒，什么都没留下' }}
        </div>

        <div class="niko-user-card-meta">
          <span class="niko-user-card-meta-item">
            <span class="niko-user-card-meta-label">IP位置：</span>
            <span>{{ info.user_location || '未知' }}</span>
          </span>
          <span class="niko-user-card-meta-item">
            <span class="niko-user-card-meta-label">NKO号：</span>
            <span>{{ info.user_show_id || '-' }}</span>
          </span>
        </div>

        <div v-if="statsText" class="niko-user-card-stats">{{ statsText }}</div>
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
const vipIcon = computed(() => resolveImageUrl(String(props.info?.vip_info?.vip_icon || '')));
const genderText = computed(() => {
  const age = props.info?.age || 0;
  const gender = Number(props.info?.gender ?? -1);
  if (gender === 1) {
    return `男 ${age}`;
  }
  if (gender === 0) {
    return `女 ${age}`;
  }
  return '';
});
const genderClass = computed(() => (Number(props.info?.gender) === 1 ? 'is-male' : 'is-female'));
const statsText = computed(() => {
  const fans = Number(props.info?.fans_count || 0);
  const contribution = Number(props.info?.contribution || 0);
  if (!fans && !contribution) {
    return '';
  }
  return `粉丝 ${fans} · 贡献 ${contribution}`;
});
</script>

<style scoped>
.niko-user-card-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.niko-user-card {
  position: relative;
  width: 20rem;
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: linear-gradient(180deg, #23242b 0%, #191a20 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.niko-user-card-close {
  position: absolute;
  top: 0.5rem;
  right: 0.6rem;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
}

.niko-user-card-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.niko-user-card-loading {
  padding: 1.5rem 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8125rem;
}

.niko-user-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.niko-user-card-avatar-wrap {
  position: relative;
  flex: none;
  width: 3.75rem;
  height: 3.75rem;
}

.niko-user-card-avatar {
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 50%;
  object-fit: cover;
  background: #2c2d34;
}

.niko-user-card-frame {
  position: absolute;
  inset: -0.25rem;
  width: calc(100% + 0.5rem);
  height: calc(100% + 0.5rem);
  object-fit: contain;
  pointer-events: none;
}

.niko-user-card-head {
  flex: 1;
  min-width: 0;
}

.niko-user-card-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.niko-user-card-name {
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.niko-user-card-gender {
  flex: none;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.6875rem;
}

.niko-user-card-gender.is-male {
  color: #6fb6ff;
  background: rgba(58, 123, 213, 0.22);
}

.niko-user-card-gender.is-female {
  color: #ff8fb1;
  background: rgba(255, 99, 146, 0.2);
}

.niko-user-card-badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.niko-user-card-level,
.niko-user-card-vip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  color: #ffd479;
  background: rgba(255, 196, 84, 0.14);
}

.niko-user-card-level img,
.niko-user-card-vip img {
  width: 0.95rem;
  height: 0.95rem;
  object-fit: contain;
}

.niko-user-card-signature {
  margin-top: 0.9rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.05);
  word-break: break-all;
}

.niko-user-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.72);
}

.niko-user-card-meta-label {
  color: rgba(255, 255, 255, 0.45);
}

.niko-user-card-stats {
  margin-top: 0.65rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
}
</style>

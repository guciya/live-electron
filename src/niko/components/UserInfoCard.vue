<template>
  <div v-if="visible" class="niko-user-card-mask" @click="emit('close')">
    <div class="niko-user-card" @click.stop>
      <!-- 名片背景（与 web-obs-live UserInfoDialog 对齐：adorn.profile_card.card_image） -->
      <div
        class="niko-user-card-header"
        :style="businessCardBg ? { backgroundImage: businessCardBg } : {}"
      >
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
            <!-- 角色标签：主播/房管 -->
            <span v-if="info.is_anchor" class="niko-role-badge is-anchor">主播</span>
            <span v-if="info.is_manager" class="niko-role-badge is-manager">房管</span>
          </div>
          <div class="niko-user-card-badges">
            <!-- VIP -->
            <span v-if="info.vip_info?.vip_name" class="niko-user-card-vip">
              <img v-if="vipIcon" :src="vipIcon" alt="" />
              {{ info.vip_info.vip_name }}
            </span>
            <!-- 用户等级：优先展示 gif 动效（level_gif_icon） -->
            <span v-if="userLevelGifIcon || userLevelIcon" class="niko-user-card-level">
              <img v-if="userLevelGifIcon" :src="userLevelGifIcon" class="level-gif" alt="" />
              <img v-else-if="userLevelIcon" :src="userLevelIcon" alt="" />
            </span>
            <!-- 主播等级（user_anchor_info） -->
            <span v-if="anchorLevelGifIcon || anchorLevelIcon" class="niko-user-card-level is-anchor-level">
              <img v-if="anchorLevelGifIcon" :src="anchorLevelGifIcon" class="level-gif" alt="" />
              <img v-else-if="anchorLevelIcon" :src="anchorLevelIcon" alt="" />
            </span>
          </div>
        </div>
        <button class="niko-user-card-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </div>

      <div class="niko-user-card-signature">
        {{ info.introduction || '这个人很懒，什么都没留下' }}
      </div>

      <div class="niko-user-card-meta">
        <div class="niko-user-card-meta-row">
          <span class="niko-user-card-meta-item">
            <span class="niko-user-card-meta-label">IP位置：</span>
            <span>{{ info.user_location || '未知' }}</span>
          </span>
          <span class="niko-user-card-meta-item">
            <span class="niko-user-card-meta-label">NKO号：</span>
            <span>{{ info.user_show_id || '-' }}</span>
          </span>
        </div>
        <div v-if="fansText" class="niko-user-card-meta-row">
          {{ fansText }}
        </div>
      </div>
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

/** 名片背景（profile_card.card_image）—— web-obs-live 用这个做 header 渐变背景 */
const businessCardBg = computed(() => {
  const url = resolveImageUrl(String(props.info?.adorn?.profile_card?.card_image || ''));
  return url ? `url(${url})` : '';
});

/** 用户等级徽章：优先 level_gif_icon（动效），降级 level_card_icon → level_icon */
const userLevelGifIcon = computed(() => resolveImageUrl(
  String(props.info?.user_level_info?.level_gif_icon || ''),
));
const userLevelIcon = computed(() => resolveImageUrl(String(
  props.info?.user_level_info?.level_card_icon
  || props.info?.user_level_info?.level_icon
  || '',
)));

/** 主播等级徽章（user_anchor_info） */
const anchorLevelGifIcon = computed(() => resolveImageUrl(
  String(props.info?.user_anchor_info?.level_gif_icon || ''),
));
const anchorLevelIcon = computed(() => resolveImageUrl(String(
  props.info?.user_anchor_info?.level_card_icon
  || props.info?.user_anchor_info?.level_icon
  || '',
)));

const vipIcon = computed(() => resolveImageUrl(String(props.info?.vip_info?.vip_icon || '')));

const genderText = computed(() => {
  const age = props.info?.age || 0;
  const gender = Number(props.info?.gender ?? -1);
  if (gender === 1) return `男 ${age}`;
  if (gender === 0) return `女 ${age}`;
  return '';
});
const genderClass = computed(() => (Number(props.info?.gender) === 1 ? 'is-male' : 'is-female'));

const fansText = computed(() => {
  const fans = Number(props.info?.fans_count || 0);
  if (!fans) return '';
  return `粉丝 ${fans}`;
});
</script>

<style scoped lang="scss">
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
  width: 22rem;
  border-radius: 0.75rem;
  background: linear-gradient(180deg, #1e1e2e 0%, #191a20 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  color: #fff;
  overflow: hidden;
}

.niko-user-card-close {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
  border: none;
  border-radius: 50%;
  z-index: 2;

  &:hover {
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
  }
}

.niko-user-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem 1.25rem 1rem;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  position: relative;

  // 没有名片背景时的默认渐变
  &:not(:style) {
    background: linear-gradient(135deg, rgba(255, 48, 109, 0.15), rgba(74, 144, 226, 0.15));
  }
}

.niko-user-card-avatar-wrap {
  position: relative;
  flex: none;
  width: 4.25rem;
  height: 4.25rem;
  margin-top: 100px;
}

.niko-user-card-avatar {
  width: 4.25rem;
  margin-top: 100px;
  height: 4.25rem;
  border-radius: 50%;
  object-fit: cover;
  background: #2c2d34;
  border: 2px solid rgba(255, 255, 255, 0.2);
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
  padding-top: 0.3rem;
}

.niko-user-card-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.niko-user-card-name {
  font-size: 1.1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.niko-user-card-gender {
  flex: none;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  font-size: 0.7rem;

  &.is-male {
    color: #6fb6ff;
    background: linear-gradient(135deg, rgba(98, 181, 241, 0.35), rgba(74, 144, 226, 0.35));
  }
  &.is-female {
    color: #ff8fb1;
    background: linear-gradient(135deg, rgba(245, 105, 214, 0.3), rgba(232, 75, 160, 0.3));
  }
}

.niko-role-badge {
  flex: none;
  padding: 0.05rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;

  &.is-anchor {
    color: #fff;
    background: linear-gradient(135deg, #ff306d, #ff5080);
  }
  &.is-manager {
    color: #fff;
    background: linear-gradient(135deg, #4a9eff, #6db1ff);
  }
}

.niko-user-card-badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
}

.niko-user-card-level,
.niko-user-card-vip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.7rem;
  color: #ffd479;
  background: rgba(255, 196, 84, 0.14);

  img {
    height: 1rem;
    width: auto;
    object-fit: contain;
    display: block;
  }

  .level-gif {
    height: 1.1rem;
  }
}

.niko-user-card-level {
  background: rgba(255, 255, 255, 0.06);

  &.is-anchor-level {
    background: rgba(216, 41, 255, 0.18);
    color: #ff9dff;
  }
}

.niko-user-card-signature {
  margin: 0.9rem 1.25rem 0;
  padding: 0.55rem 0.65rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.05);
  word-break: break-all;
}

.niko-user-card-meta {
  padding: 0.75rem 1.25rem 1.1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.72);
}

.niko-user-card-meta-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.4rem;
  margin-bottom: 0.4rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.niko-user-card-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.niko-user-card-meta-label {
  color: rgba(255, 255, 255, 0.45);
}
</style>

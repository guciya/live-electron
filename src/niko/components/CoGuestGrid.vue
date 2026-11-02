<template>
  <!-- 独立 TRTC 连麦宫格：左边 70% 主画面 + 右边 30% 侧边栏 -->
  <!-- 任意 slot 点右下放大按钮即可切换成主画面，原主画面移到侧边栏 -->
  <div class="cogrid" :class="gridClass">
    <!-- 主画面（默认主播，被放大的人会切到这里） -->
    <div class="cogrid-main">
      <CoSlot
        :user="mainUser"
        :is-main="true"
        :anchor-user-id="anchorUserId"
        :anchor-name="anchorName"
        :video-ref-setter="setVideoRef"
        @pin="(u) => pinMain(u.userId)"
      />
    </div>

    <!-- 侧边栏：除主画面外的所有人，按固定顺序排列 -->
    <div v-if="sideUsers.length > 0" class="cogrid-side">
      <template v-for="u in sideUsers" :key="u.userId">
        <CoSlot
          :user="u"
          :is-main="false"
          :anchor-user-id="anchorUserId"
          :anchor-name="anchorName"
          :video-ref-setter="setVideoRef"
          @pin="(uu) => pinMain(uu.userId)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, nextTick, ref, watch, h, defineComponent } from 'vue';

export interface CoGuestUser {
  userId: string;
  nickname?: string;
}

const props = defineProps<{
  anchorUserId: string;
  anchorName?: string;
  guestUsers: CoGuestUser[];
}>();

const emit = defineEmits<{
  (e: 'video-ready', users: CoGuestUser[]): void;
  (e: 'video-remove', userIds: string[]): void;
}>();

/** 当前被"置顶"到主画面的 userId；空则主播为主 */
const pinnedMainUserId = ref<string>('');

const videoRefs = new Map<string, HTMLVideoElement | null>();

function setVideoRef(userId: string, el: HTMLVideoElement | null) {
  videoRefs.set(userId, el);
}

/** 对外提供拿到 DOM 的方法（TRTC 调用 startRemoteView 时需要） */
function getVideoEl(userId: string): HTMLVideoElement | null | undefined {
  return videoRefs.get(userId);
}

defineExpose({ getVideoEl });

/** 所有可展示的用户：主播 + 连麦观众（去重，主播统一排第一） */
const allUsers = computed<CoGuestUser[]>(() => {
  const anchor: CoGuestUser = { userId: props.anchorUserId, nickname: props.anchorName };
  const guests = props.guestUsers.filter((g) => g.userId !== props.anchorUserId);
  // 稳定排序：按 userId 字典序，避免切换闪烁；锚点始终放第一个
  guests.sort((a, b) => a.userId.localeCompare(b.userId));
  return [anchor, ...guests];
});

/** 当前主画面用户：pinned → pinned 的用户，否则主播 */
const mainUser = computed<CoGuestUser>(() => {
  const pid = pinnedMainUserId.value;
  if (pid) {
    const hit = allUsers.value.find((u) => u.userId === pid);
    if (hit) return hit;
  }
  return allUsers.value[0]; // fallback 到主播
});

/** 侧边栏：所有 - 主画面 */
const sideUsers = computed<CoGuestUser[]>(() => {
  const mainId = mainUser.value.userId;
  return allUsers.value.filter((u) => u.userId !== mainId);
});

/** 主画面 / 侧边栏布局 class */
const gridClass = computed(() => {
  if (sideUsers.value.length === 0) return 'is-single';
  return 'is-split'; // 永远是左 70% 右 30%
});

function pinMain(userId: string) {
  if (userId === mainUser.value.userId) return; // 已经在主画面
  if (!userId) return;
  pinnedMainUserId.value = userId;
}

// 主播 userId 变化时，重置置顶（避免主播不在当前列表的旧 pin）
watch(
  () => props.anchorUserId,
  () => {
    if (pinnedMainUserId.value && !allUsers.value.find((u) => u.userId === pinnedMainUserId.value)) {
      pinnedMainUserId.value = '';
    }
  },
);

// 连麦用户列表变化时，清掉已下线的置顶用户
watch(
  () => props.guestUsers.map((u) => u.userId).join(','),
  () => {
    if (pinnedMainUserId.value && !allUsers.value.find((u) => u.userId === pinnedMainUserId.value)) {
      pinnedMainUserId.value = '';
    }
  },
);

watch(
  allUsers,
  async () => {
    await nextTick();
    emit('video-ready', allUsers.value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  videoRefs.clear();
});

// 子组件：单个视频 slot
const CoSlot = defineComponent({
  name: 'CoSlot',
  props: {
    user: { type: Object as () => CoGuestUser, required: true },
    isMain: { type: Boolean, default: false },
    anchorUserId: { type: String, default: '' },
    anchorName: { type: String, default: '' },
    videoRefSetter: { type: Function, required: true },
  },
  emits: ['pin'],
  setup(props, { emit }) {
    const videoRef = ref<HTMLVideoElement | null>(null);
    function onVideoEl(el: HTMLVideoElement | null) {
      videoRef.value = el;
      props.videoRefSetter(props.user.userId, el);
    }
    return () => {
      const isAnchor = props.user.userId === props.anchorUserId;
      return h(
        'div',
        { class: ['cogrid-slot', props.isMain ? 'cogrid-main-slot' : 'cogrid-side-slot', isAnchor ? 'is-anchor' : ''] },
        [
          h('video', {
            ref: onVideoEl,
            class: 'cogrid-video',
            autoplay: true,
            muted: true,
            playsinline: true,
          }),
          props.user.nickname
            ? h('div', { class: 'cogrid-label' }, [isAnchor ? h('span', { class: 'cogrid-badge cogrid-badge-anchor' }, '主播') : null, props.user.nickname])
            : null,
          // 放大按钮：不在主画面时才显示（在主画面里点击等于切回侧边栏，但保留一个按钮也行，这里侧边栏才显示）
          !props.isMain
            ? h(
                'button',
                {
                  class: 'cogrid-pin-btn',
                  type: 'button',
                  title: '放大到主画面',
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                    emit('pin', props.user);
                  },
                },
                [
                  h(
                    'svg',
                    { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                    [
                      h('path', { d: 'M15 3h6v6' }),
                      h('path', { d: 'M9 21H3v-6' }),
                      h('path', { d: 'M21 3l-7 7' }),
                      h('path', { d: 'M3 21l7-7' }),
                    ],
                  ),
                ],
              )
            : null,
          // 主画面里有侧边栏时，也显示一个"返回主播"按钮（主播不在主画面时）
          props.isMain && !isAnchor
            ? h(
                'button',
                {
                  class: 'cogrid-pin-btn cogrid-unpin-btn',
                  type: 'button',
                  title: '切回主播',
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                    emit('pin', { userId: props.anchorUserId, nickname: props.anchorName });
                  },
                },
                [
                  h(
                    'svg',
                    { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                    [
                      h('path', { d: 'M3 9V3h6' }),
                      h('path', { d: 'M21 15v6h-6' }),
                      h('path', { d: 'M21 3l-7 7' }),
                      h('path', { d: 'M3 21l7-7' }),
                    ],
                  ),
                ],
              )
            : null,
        ],
      );
    };
  },
});
</script>

<style lang="scss" scoped>
.cogrid {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 0.375rem;
  padding: 0.375rem;
  box-sizing: border-box;
  background: transparent;

  &.is-single {
    .cogrid-main {
      flex: 1;
    }
  }

  &.is-split {
    // 左 70% 主画面 + 右 30% 侧边栏
    .cogrid-main {
      flex: 0 0 70%;
      min-width: 0;
    }
    .cogrid-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 0;
    }
  }
}

.cogrid-slot {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);

  &.cogrid-main-slot {
    flex: 1; // 填满 cogrid-main
    width: 100%;
  }

  &.cogrid-side-slot {
    flex: 1;
    min-height: 96px;
  }

  &.is-anchor {
    border-color: rgba(255, 122, 162, 0.35); // 主播 slot 用粉色边框微标记
  }
}

.cogrid-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}

.cogrid-label {
  position: absolute;
  left: 0.5rem;
  bottom: 0.5rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.3;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 0.25rem;
  max-width: 75%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.cogrid-badge {
  font-size: 0.5625rem;
  padding: 0 0.25rem;
  height: 0.875rem;
  line-height: 0.875rem;
  border-radius: 0.1875rem;
  flex-shrink: 0;

  &.cogrid-badge-anchor {
    color: #fff;
    background: linear-gradient(135deg, #ff7aa2, #ff3d71);
  }
}

.cogrid-pin-btn {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.75);
  }

  &:active {
    transform: scale(0.94);
  }

  // 鼠标悬停 slot 时显示
  .cogrid-slot:hover & {
    opacity: 1;
  }

  &.cogrid-unpin-btn {
    // 主画面里的"切回主播"按钮，用反方向的图标，颜色偏粉提示
    color: #ff7aa2;
  }
}
</style>

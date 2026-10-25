<template>
  <div class="niko-audience" :style="{ height }">
    <div v-if="members.length === 0" class="niko-audience-empty">
      <span class="niko-audience-empty-dot" />
      {{ connecting ? t('Loading') + '...' : t('No viewers yet') }}
    </div>
    <transition-group name="niko-audience-fade" tag="div" class="niko-audience-list">
      <div
        v-for="member in members"
        :key="member.userId"
        class="niko-audience-item"
      >
        <span class="niko-audience-avatar-wrap">
          <img
            v-if="member.avatar && !brokenAvatars.has(member.userId)"
            class="niko-audience-avatar"
            :src="member.avatar"
            alt=""
            @error="onAvatarError(member.userId)"
          />
          <span v-else class="niko-audience-avatar niko-audience-avatar--placeholder">
            {{ (member.nickname || 'N').slice(0, 1) }}
          </span>
        </span>
        <span class="niko-audience-name">{{ member.nickname }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { getAudienceList, type LiveAudienceItem } from '../api/live';
import { resolveImageUrl } from '../config';
import { onLiveImMembers, refreshMembers, type LiveImMember } from '../im/liveIm';

const props = withDefaults(defineProps<{ height?: string; liveIndexId?: string | number }>(), {
  height: '100%',
  liveIndexId: '',
});

const emit = defineEmits<{ (event: 'count-change', count: number): void }>();

const { t } = useUIKit();

/** 当前登录用户 id：观众列表不展示主播自己 */
const selfUserId = (() => {
  try {
    const stored = window.localStorage.getItem('TUILiveKit-userInfo');
    return String(stored ? JSON.parse(stored)?.userId || '' : '');
  } catch (error) {
    return '';
  }
})();

interface AudienceEntry {
  userId: string;
  nickname: string;
  avatar: string;
}

/** 接口返回的权威观众列表 */
const apiMembers = ref<AudienceEntry[]>([]);
/** 接口是否已完成首次返回（成功或失败），避免先用 IM 兜底数据展示 ID、随后又被接口数据替换 */
const apiLoaded = ref(false);
/** IM 101/102 消息里的观众列表（接口不可用时的兜底） */
const imMembers = ref<LiveImMember[]>([]);
const connecting = ref(true);
const brokenAvatars = ref(new Set<string>());
let unsubscribe: (() => void) | null = null;
let timer: number | null = null;

const members = computed<AudienceEntry[]>(() => {
  if (apiMembers.value.length > 0) {
    return apiMembers.value;
  }
  // 接口首次返回前先展示加载中，不提前用 IM 的 id 兜底，避免「先 id 后名称」的闪变
  if (!apiLoaded.value) {
    return [];
  }
  return imMembers.value.map((item) => ({
    userId: item.userId,
    nickname: item.nickname || item.userId,
    avatar: resolveImageUrl(item.avatar),
  }));
});

watch(
  () => members.value.length,
  (count) => emit('count-change', count),
  { immediate: true },
);

// 开播后 pendingPreLiveId 才被赋值为 live_index_id，变化时立即拉一次在线观众；
// 关播/退出直播间时 id 被清空，同步清空列表，下次开播重新拉取
watch(
  () => props.liveIndexId,
  (liveIndexId) => {
    if (liveIndexId) {
      void loadAudience();
    } else {
      apiMembers.value = [];
      imMembers.value = [];
      apiLoaded.value = false;
      connecting.value = true;
    }
  },
);

function onAvatarError(userId: string) {
  brokenAvatars.value.add(userId);
  brokenAvatars.value = new Set(brokenAvatars.value);
}

/** 接口字段归一化：只保留头像与名称；过滤主播自己 */
function normalize(item: LiveAudienceItem): AudienceEntry | null {
  const userId = String(item.user_id ?? item.userId ?? '');
  if (!userId || userId === selfUserId) {
    return null;
  }
  // 房管/超管/主播身份（如「直播聊天室管理员」系统账号）不是真实观众，不展示
  if (item.is_manager || item.is_super || item.is_anchor) {
    return null;
  }
  return {
    userId,
    nickname: String(item.nickname || (item.user_show_id ? `ID: ${item.user_show_id}` : userId)),
    avatar: resolveImageUrl(String(item.avatar || '')),
  };
}

function dedupe(list: AudienceEntry[]): AudienceEntry[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.userId)) {
      return false;
    }
    seen.add(item.userId);
    return true;
  });
}

async function loadAudience() {
  if (!props.liveIndexId) {
    return;
  }
  try {
    const result = await getAudienceList({ liveIndexId: props.liveIndexId, audiencesType: 1 });
    const list = result?.audience_list ?? [];
    const next = dedupe(list.map(normalize).filter((item): item is AudienceEntry => !!item));
    // 后端偶发返回空列表时保留上一次结果，避免列表闪一下变空
    if (next.length > 0 || apiMembers.value.length === 0) {
      apiMembers.value = next;
    }
  } catch (error: any) {
    console.warn('[NikoAudience] getAudienceList failed:', error?.message || error);
  } finally {
    apiLoaded.value = true;
    connecting.value = false;
  }
}

/** IM 观众列表兜底：按 userId 去重、过滤空 id 与主播自己 */
function applyImMembers(list: LiveImMember[]) {
  const seen = new Set<string>();
  const next: LiveImMember[] = [];
  list.forEach((item) => {
    const userId = String(item.userId || '');
    if (!userId || seen.has(userId) || userId === selfUserId) {
      return;
    }
    seen.add(userId);
    next.push({
      userId,
      nickname: String(item.nickname || userId),
      avatar: String(item.avatar || ''),
    });
  });
  if (next.length === 0 && imMembers.value.length > 0) {
    return;
  }
  imMembers.value = next;
  // 接口未就绪前不改变 connecting，保持加载中，避免先用 IM 兜底渲染
  if (apiLoaded.value) {
    connecting.value = false;
  }
}

onMounted(() => {
  unsubscribe = onLiveImMembers(applyImMembers);
  // 进群后先拉一次接口，AVChatRoom 不支持群成员列表时由 IM 消息兜底
  void loadAudience();
  refreshMembers();
  timer = window.setInterval(() => {
    void loadAudience();
  }, 15000);
});

onBeforeUnmount(() => {
  unsubscribe?.();
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
.niko-audience {
  overflow-y: auto;
  padding: 4px 10px 8px;
}

.niko-audience-list {
  display: flex;
  flex-direction: column;
}

.niko-audience-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--uikit-color-text-secondary, #888);
  font-size: 12px;
  padding: 6px 0;
}

.niko-audience-empty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.niko-audience-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  font-size: 13px;
}

.niko-audience-avatar-wrap {
  position: relative;
  flex: none;
  width: 30px;
  height: 30px;
}

.niko-audience-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.12);
}

.niko-audience-avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08));
  font-size: 12px;
  color: #fff;
}

.niko-audience-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.88);
}

/* 只用透明度过渡，避免布局位移造成的“闪”感 */
.niko-audience-fade-enter-active,
.niko-audience-fade-leave-active {
  transition: opacity 0.25s ease;
}

.niko-audience-fade-enter-from,
.niko-audience-fade-leave-to {
  opacity: 0;
}

.niko-audience-fade-move {
  transition: transform 0.25s ease;
}
</style>

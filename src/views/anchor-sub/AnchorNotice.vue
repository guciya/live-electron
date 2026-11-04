<template>
  <UIKitProvider theme="dark">
    <div class="sub-page">
      <PageThreeBackdrop variant="notice" />
      <header class="sub-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="header-title">平台通知</span>
        </div>
        <div class="header-right">
          <button class="link-btn" type="button" v-if="unread > 0" @click="markAllRead">全部已读</button>
          <div class="window-tool">
            <button class="window-tool-btn" type="button" @click="onMinimize"><svg-icon :icon="MinimizeIcon" /></button>
            <button class="window-tool-btn" type="button" @click="onToggleMaximize">
              <svg-icon v-if="!isMaximized" :icon="MaximizeIcon" />
              <svg-icon v-else :icon="MiniIcon" />
            </button>
            <button class="window-tool-btn" type="button" @click="onClose"><svg-icon :icon="CloseIcon" /></button>
          </div>
        </div>
      </header>

      <main class="sub-body">
        <div v-if="loading" class="empty"><p>加载中...</p></div>
        <div v-else-if="loadError" class="empty">
          <p>通知加载失败：{{ loadError }}</p>
          <button class="link-btn" type="button" @click="loadNotices">重试</button>
        </div>
        <div class="notice-list" v-else-if="list.length">
          <div
            class="notice-card"
            :class="{ 'notice-card--unread': !item.read }"
            v-for="(item, i) in list"
            :key="i"
            @click="openNotice(i)"
          >
            <div class="notice-dot" v-if="!item.read"></div>
            <div class="notice-icon" :class="'notice-icon--' + item.type">
              <svg v-if="item.type === 'system'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
              </svg>
              <svg v-else-if="item.type === 'income'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-linecap="round" />
              </svg>
              <svg v-else-if="item.type === 'activity'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <path d="M12 6V2M8 6V4M16 6V4" stroke-linecap="round" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round" />
              </svg>
            </div>
            <div class="notice-body">
              <div class="notice-head">
                <span class="notice-title">{{ item.title }}</span>
                <span class="notice-time">{{ item.time }}</span>
              </div>
              <div class="notice-desc">{{ item.desc }}</div>
            </div>
            <svg class="notice-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        <div v-else class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p>暂无通知</p>
        </div>
      </main>

      <!-- 详情 -->
      <transition name="fade">
        <div class="modal-mask" v-if="detail !== null" @click.self="detail = null">
          <div class="modal-card">
            <div class="modal-header">
              <span>{{ list[detail!]?.title }}</span>
              <button class="modal-close" @click="detail = null">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div class="modal-body" v-if="detail !== null">
              <div class="detail-meta">{{ list[detail!]?.time }}</div>
              <p class="detail-desc">{{ list[detail!]?.desc }}</p>
              <p class="detail-content" v-html="list[detail!]?.content"></p>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import PageThreeBackdrop from '../../niko/components/PageThreeBackdrop.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';
import { getAnchorNotifyList } from '../../niko/api/live';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

interface Notice { type: 'system' | 'income' | 'activity' | 'other'; title: string; desc: string; content: string; time: string; read: boolean; }
const list = ref<Notice[]>([]);
const loading = ref(false);
const loadError = ref('');

/** message_type 映射到卡片图标类型：0 系统 / 1 收益 / 2 活动 / 其他 */
function toNoticeType(messageType?: number): Notice['type'] {
  if (messageType === 1) return 'income';
  if (messageType === 2) return 'activity';
  if (messageType === 0) return 'system';
  return 'other';
}

async function loadNotices() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await getAnchorNotifyList();
    list.value = (data || []).map((item) => ({
      type: toNoticeType(item.message_type),
      title: item.title || '',
      desc: item.message || '',
      content: item.message || '',
      time: item.create_time || '',
      read: false,
    }));
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载失败';
    console.warn('[AnchorNotice] load failed:', err);
  } finally {
    loading.value = false;
  }
}

const unread = computed(() => list.value.filter(n => !n.read).length);
const detail = ref<number | null>(null);
function openNotice(i: number) { list.value[i].read = true; detail.value = i; }
function markAllRead() { list.value.forEach(n => n.read = true); showMessage({ type: MessageToastType.Success, message: '已全部标为已读' }); }

onMounted(() => {
  loadNotices();
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
});
</script>

<style scoped>
.sub-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    radial-gradient(circle at 84% 88%, rgba(179, 159, 255, 0.09), transparent 46%),
    radial-gradient(circle at 6% 10%, rgba(244, 114, 182, 0.05), transparent 44%),
    #0a0a10;
  color: #e6e6ea;
}
.sub-header,
.sub-body { position: relative; z-index: 1; }
.sub-header { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 10px 0 0; background: rgba(20,20,28,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); -webkit-app-region: drag; flex-shrink: 0; }
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.link-btn { height: 28px; padding: 0 10px; border: none; background: transparent; color: #8b7be6; font-size: 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
.link-btn:hover { background: rgba(139,123,230,0.15); color: #b39fff; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 18px 28px 32px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.notice-list { display: flex; flex-direction: column; gap: 10px; }
.notice-card {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(30,30,42,0.8);
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.notice-card:hover { background: rgba(36,36,50,0.95); border-color: rgba(139,92,246,0.18); }
.notice-card--unread { background: rgba(40,30,70,0.4); border-color: rgba(139,92,246,0.15); }
.notice-dot { position: absolute; top: 14px; left: 14px; width: 7px; height: 7px; border-radius: 50%; background: #f472b6; }

.notice-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; margin-left: 8px;
}
.notice-icon svg { width: 18px; height: 18px; }
.notice-icon--system   { background: rgba(59,130,246,0.16); color: #60a5fa; }
.notice-icon--income   { background: rgba(251,191,36,0.16);  color: #fbbf24; }
.notice-icon--activity { background: rgba(244,114,182,0.16); color: #f472b6; }
.notice-icon--other    { background: rgba(139,123,230,0.16);color: #b39fff; }

.notice-body { flex: 1; min-width: 0; }
.notice-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.notice-title { font-size: 13px; font-weight: 600; color: #fff; }
.notice-time { font-size: 11px; color: rgba(255,255,255,0.35); flex-shrink: 0; }
.notice-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-chevron { width: 14px; height: 14px; color: rgba(255,255,255,0.3); flex-shrink: 0; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: rgba(255,255,255,0.35); }
.empty p { font-size: 13px; margin-top: 12px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 520px; max-height: 70vh; background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-close svg { width: 16px; height: 16px; }
.modal-body { padding: 20px 24px; overflow-y: auto; }
.detail-meta { font-size: 11px; color: rgba(255,255,255,0.35); margin-bottom: 14px; }
.detail-desc { font-size: 14px; color: rgba(255,255,255,0.85); margin: 0 0 14px; line-height: 1.7; }
.detail-content { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.9; margin: 0; }
.detail-content b { color: #fbbf24; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

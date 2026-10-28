<template>
  <UIKitProvider theme="dark">
    <div class="sub-page">
      <header class="sub-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="header-title">贡献榜单</span>
        </div>
        <div class="header-right">
          <button class="link-btn" type="button" @click="showHelp = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
            说明
          </button>
          <select class="filter-select" v-model.number="sortType" @change="reload">
            <option :value="1">默认排序</option>
            <option :value="2">按时间排序</option>
          </select>
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
        <!-- Top 3 -->
        <section class="top3" v-if="top3.length">
          <div class="top3-card" v-for="(u, i) in top3" :key="u.user_id" :class="'top3-card--' + (i + 1)">
            <div class="top3-medal">{{ i + 1 }}</div>
            <div class="top3-avatar">
              <img v-if="avatarOf(u)" :src="avatarOf(u)" alt="" @error="onImgErr" />
              <span v-else>{{ displayName(u).charAt(0) }}</span>
            </div>
            <div class="top3-name">
              {{ displayName(u) }}
              <img v-if="levelIcon(u)" class="level-badge" :src="levelIcon(u)" alt="" />
            </div>
            <div class="top3-tags">
              <span class="tag" v-for="t in userTags(u)" :key="t">{{ t }}</span>
            </div>
            <div class="top3-score">
              <span class="score-num">{{ formatNumber(u.contribute) }}</span>
              <span class="score-flame">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </span>
            </div>
          </div>
        </section>

        <!-- 其余 -->
        <section class="rank-list">
          <div class="rank-row" v-for="(u, idx) in rest" :key="u.user_id">
            <span class="rank-num">{{ idx + 4 }}</span>
            <div class="rank-avatar">
              <img v-if="avatarOf(u)" :src="avatarOf(u)" alt="" @error="onImgErr" />
              <span v-else>{{ displayName(u).charAt(0) }}</span>
            </div>
            <div class="rank-name">
              {{ displayName(u) }}
              <img v-if="levelIcon(u)" class="level-badge" :src="levelIcon(u)" alt="" />
            </div>
            <div class="rank-tags">
              <span class="tag" v-for="t in userTags(u)" :key="t">{{ t }}</span>
            </div>
            <div class="rank-score">
              <span class="score-num">{{ formatNumber(u.contribute) }}</span>
              <span class="score-flame">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </span>
            </div>
          </div>
          <div v-if="loading" class="empty">加载中...</div>
          <div v-else-if="error" class="empty empty-error">
            {{ error }}
            <button class="retry-btn" type="button" @click="loadList">重试</button>
          </div>
          <div v-else-if="!list.length" class="empty">暂无贡献记录</div>
          <div v-else-if="!rest.length" class="empty">暂无更多榜单数据</div>
        </section>
      </main>

      <!-- 说明弹窗 -->
      <transition name="fade">
        <div class="modal-mask" v-if="showHelp" @click.self="showHelp = false">
          <div class="modal-card">
            <div class="modal-header">
              <span>说明</span>
              <button class="modal-close" @click="showHelp = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <h4>一、贡献榜排序</h4>
              <p>1. 贡献榜是用户在主播处累计的贡献榜，不是具体送礼榜单，不做主播具体收益参考。</p>
              <p>2. 贡献榜的排序规则根据单个用户累计在主播处贡献的心动高低为标准，可根据具体时间进行赛季排序。</p>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import { resolveImageUrl } from '../../niko/config';
import { getContributeUserList, type ContributeUserItem } from '../../niko/api/live';

const router = useRouter();
const isMaximized = ref(false);
const sortType = ref(1);
const showHelp = ref(false);
const list = ref<ContributeUserItem[]>([]);
const loading = ref(false);
const error = ref('');
const top3 = computed(() => list.value.slice(0, 3));
const rest = computed(() => list.value.slice(3));

function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }
function onImgErr() { /* fallback handled in template */ }
function reload() { loadList(); }

async function loadList() {
  loading.value = true;
  error.value = '';
  try {
    list.value = await getContributeUserList({ page: 1, pageSize: 100, contributeType: 1, sortType: sortType.value });
  } catch (e) {
    console.warn('getContributeUserList failed', e);
    list.value = [];
    error.value = '贡献榜单加载失败';
  } finally {
    loading.value = false;
  }
}

function displayName(u: ContributeUserItem) {
  return u.is_mystery ? '神秘人' : (u.nickname || '未知用户');
}
function avatarOf(u: ContributeUserItem) {
  return u.is_mystery ? '' : resolveImageUrl(u.avatar);
}
function levelIcon(u: ContributeUserItem) {
  return resolveImageUrl(u.user_level_info?.user_level_icon);
}
function userTags(u: ContributeUserItem): string[] {
  const tags: string[] = [];
  if (u.gender === 1) tags.push('男');
  else if (u.gender === 2) tags.push('女');
  if (u.age) tags.push(String(u.age));
  return tags;
}
function formatNumber(n: number) {
  if (!n) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
  loadList();
});
</script>

<style scoped>
.sub-page { display: flex; flex-direction: column; height: 100vh; background: #0a0a10; color: #e6e6ea; }
.sub-header {
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 10px 0 0;
  background: rgba(20,20,28,0.85); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  -webkit-app-region: drag; flex-shrink: 0;
}
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.link-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px;
  border: none; border-radius: 6px;
  background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7);
  font-size: 12px; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.link-btn:hover { background: rgba(139,123,230,0.15); color: #b39fff; }
.link-btn svg { width: 14px; height: 14px; }
.filter-select { height: 28px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: #1e1e2a; color: #fff; font-size: 12px; cursor: pointer; outline: none; }
.filter-select:focus { border-color: rgba(139,123,230,0.4); }
.filter-select option { background: #1e1e2a; color: #e6e6ea; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 24px 28px 32px; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px; }

/* Top 3 */
.top3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.top3-card {
  position: relative;
  padding: 24px 16px 20px;
  border-radius: 16px; text-align: center;
  background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9));
  border: 1px solid rgba(255,255,255,0.05);
  transition: transform 0.2s;
}
.top3-card:hover { transform: translateY(-2px); }
.top3-card--1 { border-color: rgba(251,191,36,0.35); box-shadow: 0 6px 20px rgba(251,191,36,0.12); }
.top3-card--2 { border-color: rgba(192,192,192,0.25); }
.top3-card--3 { border-color: rgba(205,127,50,0.25); }
.top3-medal {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #1a1033;
}
.top3-card--1 .top3-medal { background: linear-gradient(135deg, #fcd34d, #f59e0b); }
.top3-card--2 .top3-medal { background: linear-gradient(135deg, #e5e7eb, #9ca3af); }
.top3-card--3 .top3-medal { background: linear-gradient(135deg, #fb923c, #c2410c); }

.top3-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  margin: 8px auto 10px;
  padding: 3px;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  display: flex; align-items: center; justify-content: center;
}
.top3-avatar img, .top3-avatar > span {
  width: 100%; height: 100%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #1a1033; color: #c8c0ff; font-size: 26px; font-weight: 700;
  object-fit: cover;
}
.top3-name { font-size: 15px; font-weight: 700; color: #fff; }
.top3-tags { display: flex; justify-content: center; gap: 5px; margin-top: 6px; }
.top3-score { margin-top: 10px; display: flex; align-items: baseline; justify-content: center; gap: 4px; }

/* Tag */
.tag {
  font-size: 10px; padding: 2px 8px; border-radius: 8px;
  background: rgba(139,92,246,0.15); color: #b39fff;
  border: 1px solid rgba(139,92,246,0.25);
}

.score-num { font-size: 20px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.score-flame { width: 16px; height: 16px; color: #f97316; display: inline-flex; align-items: center; align-self: center; }
.score-flame svg { width: 100%; height: 100%; }
.level-badge { height: 16px; width: auto; vertical-align: middle; margin-left: 4px; }

/* List */
.rank-list {
  background: rgba(30,30,42,0.95);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; overflow: hidden;
}
.rank-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.rank-row:last-child { border-bottom: none; }
.rank-row:hover { background: rgba(139,123,230,0.05); }
.rank-num { width: 24px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.45); text-align: center; }
.rank-avatar {
  width: 42px; height: 42px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: #1a1033; display: flex; align-items: center; justify-content: center;
  color: #c8c0ff; font-size: 16px; font-weight: 700;
}
.rank-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rank-name { flex: 1; font-size: 14px; font-weight: 500; color: #fff; min-width: 0; }
.rank-tags { display: flex; gap: 5px; }
.rank-score { display: flex; align-items: baseline; gap: 4px; }

.empty { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }
.empty-error { color: #f87171; }
.retry-btn { margin-left: 8px; height: 24px; padding: 0 10px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; background: transparent; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; }
.retry-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 440px; background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; font-weight: 700; color: #fff; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-close svg { width: 16px; height: 16px; }
.modal-body { padding: 20px 22px; }
.modal-body h4 { margin: 0 0 10px; font-size: 13px; color: #b39fff; }
.modal-body p { margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.8; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

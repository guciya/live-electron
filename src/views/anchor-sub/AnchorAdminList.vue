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
          <span class="header-title">管理员</span>
        </div>
        <div class="header-right">
          <span class="tip">共 {{ list.length }} 位管理员</span>
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
        <section class="section-card">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-title">直播间管理员</span>
              <span class="section-sub">最多可设置 3 位，管理员可禁言、踢人、置顶聊天</span>
            </div>
            <button class="primary-btn" type="button" @click="showAdd = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加管理员
            </button>
          </div>

          <div class="admin-list" v-if="list.length">
            <div class="admin-row" v-for="(u, i) in list" :key="i">
              <div class="admin-avatar">{{ (u.nickname || '?').charAt(0) }}</div>
              <div class="admin-info">
                <div class="admin-name">
                  {{ u.nickname }}
                  <span class="admin-tag" v-if="u.isOwner">房主</span>
                </div>
                <div class="admin-id">ID: {{ u.id }} · 添加于 {{ u.addedAt }}</div>
              </div>
              <button v-if="!u.isOwner" class="danger-btn" type="button" @click="removeUser(i)">解除</button>
              <span v-else class="owner-label">房主不可移除</span>
            </div>
          </div>
          <div v-else class="empty">暂无管理员</div>
        </section>
      </main>

      <!-- 添加弹窗 -->
      <transition name="fade">
        <div class="modal-mask" v-if="showAdd" @click.self="showAdd = false">
          <div class="modal-card">
            <div class="modal-header">
              <span>添加管理员</span>
              <button class="modal-close" @click="showAdd = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-form-row">
                <label>用户 ID / Niko号</label>
                <input v-model="addId" class="form-input" placeholder="请输入用户 ID 或 Niko号" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="ghost-btn" @click="showAdd = false">取消</button>
              <button class="primary-btn" @click="confirmAdd">确定</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

interface AdminUser { nickname: string; id: string; addedAt: string; isOwner?: boolean; }
const list = ref<AdminUser[]>([
  { nickname: 'why', id: '9527', addedAt: '2026.09.01', isOwner: true },
  { nickname: '小明', id: '10086', addedAt: '2026.10.15' },
]);

const showAdd = ref(false);
const addId = ref('');
function confirmAdd() {
  if (!addId.value.trim()) { showMessage({ type: MessageToastType.Warning, message: '请输入用户 ID' }); return; }
  if (list.value.length >= 3) { showMessage({ type: MessageToastType.Warning, message: '最多设置 3 位管理员' }); return; }
  list.value.push({ nickname: '用户_' + addId.value, id: addId.value, addedAt: new Date().toLocaleDateString('zh-CN').replace(/\//g, '.') });
  showAdd.value = false; addId.value = '';
  showMessage({ type: MessageToastType.Success, message: '添加成功' });
}
function removeUser(i: number) {
  list.value.splice(i, 1);
  showMessage({ type: MessageToastType.Info, message: '已解除管理员权限' });
}

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
});
</script>

<style scoped>
.sub-page { display: flex; flex-direction: column; height: 100vh; background: #0a0a10; color: #e6e6ea; }
.sub-header { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 10px 0 0; background: rgba(20,20,28,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); -webkit-app-region: drag; flex-shrink: 0; }
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.tip { font-size: 12px; color: rgba(255,255,255,0.5); margin-right: 8px; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.section-card { background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9)); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 18px 22px; }
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.section-title-row { display: flex; flex-direction: column; gap: 4px; }
.section-title { font-size: 14px; font-weight: 700; color: #f0f0f4; }
.section-sub { font-size: 11px; color: rgba(255,255,255,0.4); }

.admin-list { display: flex; flex-direction: column; gap: 6px; }
.admin-row { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
.admin-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #6b46c1, #f472b6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.admin-info { flex: 1; min-width: 0; }
.admin-name { font-size: 14px; font-weight: 600; color: #fff; display: inline-flex; align-items: center; gap: 8px; }
.admin-tag { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
.admin-id { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; }
.danger-btn { height: 28px; padding: 0 12px; border-radius: 6px; border: none; background: rgba(239,68,68,0.15); color: #f87171; font-size: 11px; cursor: pointer; transition: background 0.15s; }
.danger-btn:hover { background: rgba(239,68,68,0.28); }
.owner-label { font-size: 11px; color: rgba(255,255,255,0.35); }

.empty { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.primary-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 14px; border: none; border-radius: 8px; background: linear-gradient(90deg, #6b46c1, #8b5cf6); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 10px rgba(139,92,246,0.3); }
.primary-btn svg { width: 14px; height: 14px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 420px; background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; font-weight: 700; color: #fff; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-close svg { width: 16px; height: 16px; }
.modal-body { padding: 18px 22px; }
.modal-form-row label { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.form-input { width: 100%; height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #fff; font-size: 13px; outline: none; box-sizing: border-box; }
.form-input:focus { border-color: rgba(139,92,246,0.5); }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid rgba(255,255,255,0.05); }
.ghost-btn { height: 32px; padding: 0 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; }
.ghost-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

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
          <span class="header-title">付费名单</span>
        </div>
        <div class="header-right">
          <span class="tip">已配置 {{ list.length }} 位用户</span>
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
        <!-- 付费设置 -->
        <section class="section-card">
          <div class="section-title">付费入场</div>
          <div class="form-row">
            <label class="form-label">是否开启付费</label>
            <label class="switch">
              <input type="checkbox" v-model="enabled" />
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="form-row" v-if="enabled">
            <label class="form-label">付费价格 (K币)</label>
            <input class="form-input" v-model.number="price" type="number" min="0" placeholder="请输入价格" />
          </div>
        </section>

        <!-- 用户列表 -->
        <section class="section-card">
          <div class="section-header">
            <span class="section-title">付费用户列表</span>
            <button class="primary-btn" type="button" @click="showAdd = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加用户
            </button>
          </div>

          <div class="user-list" v-if="list.length">
            <div class="user-row" v-for="(u, i) in list" :key="i">
              <div class="user-avatar">{{ (u.nickname || '?').charAt(0) }}</div>
              <div class="user-info">
                <div class="user-name">{{ u.nickname }}</div>
                <div class="user-id">ID: {{ u.id }}</div>
              </div>
              <span class="user-price">{{ u.price }} K币</span>
              <button class="danger-btn" type="button" @click="removeUser(i)">移除</button>
            </div>
          </div>
          <div v-else class="empty">暂无付费用户</div>
        </section>
      </main>

      <!-- 添加弹窗 -->
      <transition name="fade">
        <div class="modal-mask" v-if="showAdd" @click.self="showAdd = false">
          <div class="modal-card">
            <div class="modal-header">
              <span>添加付费用户</span>
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
              <div class="modal-form-row">
                <label>付费价格 (K币)</label>
                <input v-model.number="addPrice" class="form-input" type="number" placeholder="默认 0" />
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

const enabled = ref(false);
const price = ref(1000);

interface PaidUser { nickname: string; id: string; price: number; }
const list = ref<PaidUser[]>([
  { nickname: '小明', id: '10086', price: 500 },
  { nickname: '路过', id: '10099', price: 0 },
]);

const showAdd = ref(false);
const addId = ref('');
const addPrice = ref(0);
function confirmAdd() {
  if (!addId.value.trim()) { showMessage({ type: MessageToastType.Warning, message: '请输入用户 ID' }); return; }
  list.value.unshift({ nickname: '用户_' + addId.value, id: addId.value, price: addPrice.value || 0 });
  showAdd.value = false; addId.value = ''; addPrice.value = 0;
  showMessage({ type: MessageToastType.Success, message: '添加成功' });
}
function removeUser(i: number) {
  list.value.splice(i, 1);
  showMessage({ type: MessageToastType.Info, message: '已移除' });
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

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }

.section-card { background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9)); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 18px 22px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: 700; color: #f0f0f4; }

.form-row { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.form-row:last-child { border-bottom: none; }
.form-label { width: 120px; font-size: 13px; color: rgba(255,255,255,0.7); }
.form-input { flex: 1; height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #fff; font-size: 13px; outline: none; max-width: 300px; }
.form-input:focus { border-color: rgba(139,92,246,0.5); }

/* Switch */
.switch { position: relative; width: 44px; height: 24px; display: inline-block; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.12); border-radius: 12px; transition: background 0.2s; }
.switch-slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.switch input:checked + .switch-slider { background: linear-gradient(90deg, #6b46c1, #8b5cf6); }
.switch input:checked + .switch-slider::before { transform: translateX(20px); }

/* User list */
.user-list { display: flex; flex-direction: column; gap: 6px; }
.user-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
.user-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6b46c1, #f472b6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; color: #fff; }
.user-id { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.user-price { font-size: 13px; color: #fbbf24; font-weight: 600; margin-right: 14px; }
.danger-btn { height: 28px; padding: 0 12px; border-radius: 6px; border: none; background: rgba(239,68,68,0.15); color: #f87171; font-size: 11px; cursor: pointer; transition: background 0.15s; }
.danger-btn:hover { background: rgba(239,68,68,0.28); }

.empty { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.primary-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 14px; border: none; border-radius: 8px; background: linear-gradient(90deg, #6b46c1, #8b5cf6); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 10px rgba(139,92,246,0.3); transition: transform 0.12s; }
.primary-btn:hover { transform: translateY(-1px); }
.primary-btn svg { width: 14px; height: 14px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 420px; background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; font-weight: 700; color: #fff; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-close svg { width: 16px; height: 16px; }
.modal-body { padding: 18px 22px; }
.modal-form-row { margin-bottom: 14px; }
.modal-form-row label { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.modal-form-row .form-input { width: 100%; max-width: none; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid rgba(255,255,255,0.05); }
.ghost-btn { height: 32px; padding: 0 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; }
.ghost-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

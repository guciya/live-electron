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
          <span class="header-title">直播设置</span>
        </div>
        <div class="header-right">
          <button class="primary-btn" type="button" @click="save">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            保存设置
          </button>
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
        <!-- 基础设置 -->
        <section class="section-card">
          <div class="section-title">基础设置</div>
          <div class="form-list">
            <div class="form-row">
              <label class="form-label">直播标题</label>
              <input class="form-input" v-model="form.title" placeholder="请输入直播标题" maxlength="30" />
              <span class="form-hint">{{ form.title.length }}/30</span>
            </div>
            <div class="form-row">
              <label class="form-label">直播分类</label>
              <select class="form-input" v-model="form.category">
                <option value="chat">聊天交友</option>
                <option value="game">游戏娱乐</option>
                <option value="music">音乐才艺</option>
                <option value="dance">舞蹈表演</option>
                <option value="life">生活分享</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">封面图</label>
              <div class="cover-upload" @click="triggerFileInput">
                <div class="cover-preview">
                  <img v-if="form.cover" :src="form.cover" />
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div class="cover-tip">
                  <div class="cover-tip-title">点击上传封面</div>
                  <div class="cover-tip-text">建议 750×1334 · JPG/PNG · ≤ 3MB</div>
                </div>
                <button class="cover-btn" type="button" @click.stop="triggerFileInput">上传</button>
              </div>
              <input ref="fileInput" type="file" accept="image/jpeg,image/png" style="display:none" @change="onFileChange" />
            </div>
          </div>
        </section>

        <!-- 直播设置 -->
        <section class="section-card">
          <div class="section-title">直播设置</div>
          <div class="form-list">
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">开启直播密码</div>
                <div class="form-hint">仅输入密码的观众可进入直播间</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.enablePassword" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row" v-if="form.enablePassword">
              <label class="form-label">密码</label>
              <input class="form-input" v-model="form.password" placeholder="请输入 4-6 位密码" maxlength="6" />
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">开启回放</div>
                <div class="form-hint">直播结束后自动生成回放视频</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.replay" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">允许观众录屏</div>
                <div class="form-hint">关闭后观众将无法录制你的直播</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.allowRecord" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">被邀请PK</div>
                <div class="form-hint">开启后其他主播可邀请你进行PK</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.allowPKInvite" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">被陌生人搜索PK</div>
                <div class="form-hint">开启后陌生人可在PK广场搜索到你</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.allowStrangerPK" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">开播倒计时</div>
                <div class="form-hint">开播前显示倒计时，给观众准备时间</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.countdown" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">直播列表播放</div>
                <div class="form-hint">在直播列表中自动播放预览画面</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.listAutoplay" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row form-row--switch">
              <div>
                <div class="form-label">付费直播预览</div>
                <div class="form-hint">付费直播间开启免费预览时段</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.paidPreview" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="form-row" v-if="form.paidPreview">
              <label class="form-label">免费预览时长</label>
              <select class="form-input" v-model="form.previewDuration">
                <option value="30">30 秒</option>
                <option value="60">1 分钟</option>
                <option value="120">2 分钟</option>
                <option value="300">5 分钟</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 互动设置 -->
        <section class="section-card">
          <div class="section-title">互动设置</div>
          <div class="form-list">
            <div class="form-row">
              <label class="form-label">被关注自动回复</label>
              <input class="form-input" v-model="form.autoReply" placeholder="例如：感谢关注，欢迎常来～" maxlength="50" />
            </div>
            <div class="form-row">
              <label class="form-label">直播心愿单</label>
              <div class="custom-select" @click="toggleGiftDropdown">
                <div class="custom-select-trigger" :class="{ 'custom-select-trigger--active': giftDropdownOpen }">
                  <template v-if="selectedGift">
                    <img class="gift-thumb" :src="giftImage(selectedGift)" alt="" />
                    <span class="gift-name">{{ giftName(selectedGift) }}</span>
                    <span class="gift-price">{{ giftPrice(selectedGift) }} K币</span>
                  </template>
                  <span v-else class="custom-select-placeholder">不设置</span>
                  <svg class="custom-select-arrow" :class="{ 'custom-select-arrow--up': giftDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                <transition name="dropdown">
                  <div class="custom-select-panel" v-if="giftDropdownOpen" @click.stop>
                    <div class="custom-select-item" @click="clearGift">
                      <span class="custom-select-item-text">不设置</span>
                    </div>
                    <div class="custom-select-item" v-for="g in giftList" :key="g.id" @click="selectGift(g)">
                      <img class="gift-thumb" :src="giftImage(g)" alt="" />
                      <span class="gift-name">{{ giftName(g) }}</span>
                      <span class="gift-price">{{ giftPrice(g) }} K币</span>
                    </div>
                    <div v-if="giftLoading" class="custom-select-loading">加载中...</div>
                    <div v-if="!giftLoading && !giftList.length" class="custom-select-empty">暂无礼物</div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { UIKitProvider } from '@tencentcloud/uikit-base-component-vue3';
import SvgIcon from '../../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../../TUILiveKit/common/icons/CloseIcon.vue';
import { getGiftCategory, getLiveGiftList, type GiftItem } from '../../niko/api/live';
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';

const router = useRouter();
const isMaximized = ref(false);
function goBack() { router.replace({ name: 'anchor-center' }); }
function onMinimize() { window.ipcRenderer?.send('window-minimize'); }
function onToggleMaximize() { window.ipcRenderer?.send('window-toggle-maximize'); }
function onClose() { window.ipcRenderer?.send('window-close'); }

/* ---------- 心愿单礼物 ---------- */
const giftList = ref<GiftItem[]>([]);
const giftLoading = ref(false);
const giftDropdownOpen = ref(false);

async function loadGifts() {
  giftLoading.value = true;
  try {
    const catRes: any = await getGiftCategory();
    const categories = Array.isArray(catRes) ? catRes : (catRes?.categories || []);
    const firstId = categories[0]?.id;
    if (!firstId) return;
    const giftRes: any = await getLiveGiftList(firstId);
    giftList.value = giftRes?.gift_list || giftRes || [];
  } catch (e) {
    console.warn('loadGifts failed', e);
  } finally {
    giftLoading.value = false;
  }
}
function toggleGiftDropdown() { giftDropdownOpen.value = !giftDropdownOpen.value; }
function selectGift(g: GiftItem) {
  form.wishlist = String(g.id);
  giftDropdownOpen.value = false;
}
function clearGift() {
  form.wishlist = '';
  giftDropdownOpen.value = false;
}
function giftImage(g: GiftItem) { return g.gift_image || ''; }
function giftName(g: GiftItem) { return g.gift_name || '未知礼物'; }
function giftPrice(g: GiftItem) { return Number(g.gift_price || 0); }

const selectedGift = computed(() => giftList.value.find(g => String(g.id) === form.wishlist));

const fileInput = ref<HTMLInputElement | null>(null);
function triggerFileInput() { fileInput.value?.click(); }
function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showMessage({ type: MessageToastType.Warning, message: '图片大小不能超过 3MB' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.cover = reader.result as string;
    showMessage({ type: MessageToastType.Success, message: '封面上传成功' });
  };
  reader.readAsDataURL(file);
  target.value = '';
}

const form = reactive({
  title: '欢迎来到 Niko 直播间',
  category: 'chat',
  cover: '',
  enablePassword: false,
  password: '',
  replay: true,
  allowRecord: true,
  allowPKInvite: true,
  allowStrangerPK: false,
  countdown: true,
  listAutoplay: true,
  paidPreview: false,
  previewDuration: '60',
  autoReply: '',
  wishlist: '',
});
function save() { showMessage({ type: MessageToastType.Success, message: '设置已保存' }); }

onMounted(() => {
  window.ipcRenderer?.invoke?.('window-is-maximized').then(v => { isMaximized.value = Boolean(v); }).catch(() => undefined);
  loadGifts();
  document.addEventListener('click', closeGiftDropdown);
});
onUnmounted(() => {
  document.removeEventListener('click', closeGiftDropdown);
});
function closeGiftDropdown() { giftDropdownOpen.value = false; }
</script>

<style scoped>
.sub-page { display: flex; flex-direction: column; height: 100vh; background: #0a0a10; color: #e6e6ea; }
.sub-header { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 10px 0 0; background: rgba(20,20,28,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); -webkit-app-region: drag; flex-shrink: 0; }
.sub-header .header-left, .sub-header .header-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.back-btn { width: 32px; height: 32px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.back-btn svg { width: 18px; height: 18px; }
.header-title { font-size: 14px; font-weight: 700; color: #fff; }
.primary-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 14px;
  border: none; border-radius: 8px;
  background: linear-gradient(90deg, #6b46c1, #8b5cf6);
  color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 10px rgba(139,92,246,0.3);
  transition: transform 0.12s;
}
.primary-btn:hover { transform: translateY(-1px); }
.primary-btn svg { width: 14px; height: 14px; }
.window-tool-btn { width: 34px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.window-tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.sub-body { flex: 1; overflow-y: auto; padding: 20px 28px 32px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }

.section-card { background: linear-gradient(180deg, rgba(30,30,42,0.95), rgba(22,22,30,0.9)); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 20px 24px; }
.section-title { font-size: 14px; font-weight: 700; color: #f0f0f4; margin-bottom: 16px; }

.form-list { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: flex; align-items: center; gap: 16px; }
.form-row--switch { justify-content: space-between; }
.form-label { width: 120px; font-size: 13px; color: rgba(255,255,255,0.7); flex-shrink: 0; }
.form-input {
  flex: 1; height: 38px; padding: 0 14px;
  border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: #fff; font-size: 13px;
  outline: none; max-width: 400px;
  transition: border-color 0.15s;
}
.form-input:focus { border-color: rgba(139,92,246,0.5); }
.form-hint { font-size: 11px; color: rgba(255,255,255,0.4); width: 60px; flex-shrink: 0; }
.form-row--switch .form-label { width: auto; }
.form-row--switch .form-hint { width: auto; margin-top: 3px; }

/* Select 深色适配 */
select.form-input {
  background: #1e1e2a;
  color: #e6e6ea;
  padding: 0 14px;
}
select.form-input option {
  background: #1e1e2a;
  color: #e6e6ea;
  padding: 10px 14px;
  line-height: 1.6;
}
select.form-input option:hover {
  background: rgba(139,92,246,0.2);
}

/* 自定义下拉（心愿单） */
.custom-select { position: relative; flex: 1; max-width: 400px; }
.custom-select-trigger {
  display: flex; align-items: center; gap: 10px;
  height: 40px; padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: #1e1e2a;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.custom-select-trigger:hover { border-color: rgba(139,92,246,0.35); }
.custom-select-trigger--active {
  border-color: rgba(139,92,246,0.5);
  box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
}
.custom-select-placeholder { font-size: 13px; color: rgba(255,255,255,0.4); }
.custom-select-arrow {
  width: 16px; height: 16px; margin-left: auto;
  color: rgba(255,255,255,0.4);
  transition: transform 0.2s;
}
.custom-select-arrow--up { transform: rotate(180deg); }

.custom-select-panel {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  max-height: 280px; overflow-y: auto;
  background: #1e1e2a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  z-index: 50;
  padding: 6px;
}
.custom-select-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.custom-select-item:hover { background: rgba(139,92,246,0.12); }
.custom-select-item-text { font-size: 13px; color: rgba(255,255,255,0.7); }

.gift-thumb {
  width: 32px; height: 32px; border-radius: 6px;
  object-fit: cover; flex-shrink: 0;
  background: rgba(255,255,255,0.05);
}
.gift-name { font-size: 13px; color: #fff; flex: 1; min-width: 0; }
.gift-price { font-size: 12px; color: #fbbf24; font-weight: 600; flex-shrink: 0; }

.custom-select-loading, .custom-select-empty {
  text-align: center; padding: 24px;
  font-size: 12px; color: rgba(255,255,255,0.4);
}

.custom-select-panel::-webkit-scrollbar { width: 5px; }
.custom-select-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

/* Cover */
.cover-upload { display: flex; align-items: center; gap: 14px; cursor: pointer; }
.cover-preview {
  width: 100px; height: 140px; border-radius: 10px; overflow: hidden;
  background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.35);
  transition: border-color 0.15s;
}
.cover-upload:hover .cover-preview { border-color: rgba(139,92,246,0.4); }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-preview svg { width: 30px; height: 30px; }
.cover-tip .cover-tip-title { font-size: 13px; color: rgba(255,255,255,0.7); }
.cover-tip .cover-tip-text { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }
.cover-btn { height: 32px; padding: 0 14px; border: none; border-radius: 6px; background: rgba(139,92,246,0.18); color: #b39fff; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.cover-btn:hover { background: rgba(139,92,246,0.3); }

/* Switch */
.switch { position: relative; width: 44px; height: 24px; display: inline-block; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.12); border-radius: 12px; transition: background 0.2s; }
.switch-slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.switch input:checked + .switch-slider { background: linear-gradient(90deg, #6b46c1, #8b5cf6); }
.switch input:checked + .switch-slider::before { transform: translateX(20px); }

.sub-body::-webkit-scrollbar { width: 6px; }
.sub-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
.sub-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.35); }
</style>

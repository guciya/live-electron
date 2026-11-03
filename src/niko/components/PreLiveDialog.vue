<template>
  <div class="prelive-mask" v-if="visible">
    <div class="prelive-dialog">
      <div class="prelive-header">
        <span class="prelive-title">开播设置</span>
        <button class="prelive-close" @click="handleClose">×</button>
      </div>

      <div class="prelive-body">
        <!-- 直播标题 -->
        <div class="prelive-field">
          <label class="prelive-label">直播标题</label>
          <input
            v-model="form.liveTitle"
            class="prelive-input"
            type="text"
            maxlength="30"
            placeholder="请输入直播标题"
          />
        </div>

        <!-- 直播封面 -->
        <div class="prelive-field">
          <label class="prelive-label">直播封面</label>
          <div class="prelive-cover" @click="triggerFileInput">
            <img v-if="coverPreviewUrl" :src="coverPreviewUrl" class="prelive-cover-img" alt="cover" />
            <div v-else class="prelive-cover-placeholder">
              <span>点击上传封面</span>
              <span class="prelive-cover-tip">建议尺寸 16:9，小于 2M</span>
            </div>
            <div v-if="uploading" class="prelive-cover-loading">上传中...</div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png"
            style="display:none"
            @change="handleFileChange"
          />
        </div>

        <!-- 直播分类 -->
        <div class="prelive-field" v-click-outside="closeCategoryDropdown">
          <label class="prelive-label">直播分类</label>
          <div
            class="prelive-select"
            :class="{ 'is-open': categoryDropdownOpen, 'has-value': !!form.liveCategoryId }"
            @click="categoryDropdownOpen = !categoryDropdownOpen"
          >
            <span class="prelive-select-text">{{ selectedCategoryName || '请选择分类' }}</span>
            <svg class="prelive-select-arrow" :class="{ 'is-open': categoryDropdownOpen }" viewBox="0 0 12 12" width="12" height="12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <transition name="dropdown">
            <div v-if="categoryDropdownOpen" class="prelive-dropdown-list">
              <div
                class="prelive-dropdown-item"
                :class="{ 'is-selected': form.liveCategoryId === '' }"
                @click="selectCategory('')"
              >请选择分类</div>
              <div
                v-for="cat in categories"
                :key="cat.id"
                class="prelive-dropdown-item"
                :class="{ 'is-selected': form.liveCategoryId === cat.id }"
                @click="selectCategory(cat.id)"
              >{{ cat.name }}</div>
            </div>
          </transition>
        </div>

        <!-- 门票直播设置 -->
        <div class="prelive-section-title">门票直播设置</div>
        <div class="prelive-settings-group">
          <!-- 门票直播开关 -->
          <div class="prelive-setting-row" @click="toggleIsCharge">
            <div class="row-left">
              <span class="row-label">门票直播</span>
            </div>
            <div class="row-right">
              <div class="custom-switch" :class="{ 'is-on': form.isCharge }" @click.stop="toggleIsCharge">
                <div class="switch-dot"></div>
              </div>
            </div>
          </div>

          <!-- 门票金额（只在门票直播开启时显示） -->
          <div
            v-if="form.isCharge"
            class="prelive-setting-row prelive-setting-row-inline"
          >
            <div class="row-left">
              <span class="row-label">门票金额</span>
            </div>
            <div class="row-right row-right-inline">
              <input
                class="prelive-inline-input"
                type="text"
                inputmode="decimal"
                placeholder="0"
                :value="ticketPriceDisplay"
                @input="handleTicketPriceInput"
                @blur="handleTicketPriceBlur"
              />
              <span class="input-unit">N币</span>
            </div>
          </div>

          <!-- 直播预览开关 -->
          <div
            class="prelive-setting-row"
            :class="{ 'is-disabled': !form.isCharge }"
            @click="toggleLivePreview"
          >
            <div class="row-left">
              <span class="row-label">直播预览</span>
              <span v-if="!form.isCharge" class="row-tag">需先开启门票直播</span>
            </div>
            <div class="row-right">
              <div class="custom-switch" :class="{ 'is-on': form.livePreviewEnabled }" @click.stop="toggleLivePreview">
                <div class="switch-dot"></div>
              </div>
            </div>
          </div>

          <!-- 免费预览时长 -->
          <div
            class="prelive-setting-row"
            :class="{ 'is-disabled': !form.isCharge || !form.livePreviewEnabled }"
            @click="openFreeDurationPicker"
          >
            <div class="row-left">
              <span class="row-label">免费预览时长</span>
            </div>
            <div class="row-right">
              <span class="row-value">{{ freeDurationLabel }}</span>
              <span class="row-arrow">›</span>
            </div>
          </div>

          <!-- 指定免费观众 -->
          <div
            class="prelive-setting-row"
            :class="{ 'is-disabled': !form.isCharge }"
            @click="handleOpenFreeViewers"
          >
            <div class="row-left">
              <span class="row-label">指定免费观众</span>
            </div>
            <div class="row-right">
              <span class="row-value">{{ freeViewersLabel }}</span>
              <span class="row-arrow">›</span>
            </div>
          </div>
        </div>
      </div>

      <div class="prelive-footer">
        <button class="prelive-btn prelive-btn-cancel" @click="handleClose">取消</button>
        <button class="prelive-btn prelive-btn-confirm" :disabled="submitting" @click="handleConfirm">
          {{ submitting ? '创建中...' : '开始直播' }}
        </button>
      </div>
    </div>

    <!-- 免费预览时长选择弹层 -->
    <div class="sub-dialog-mask" v-if="showDurationDialog" @click.self="showDurationDialog = false">
      <div class="sub-dialog">
        <div class="sub-dialog-title">选择免费预览时长</div>
        <div
          v-for="opt in durationOptions"
          :key="opt.value"
          class="sub-option"
          :class="{ active: form.freePreviewDurationSecond === opt.value }"
          @click="selectDuration(opt.value)"
        >
          <span>{{ opt.label }}</span>
          <span v-if="form.freePreviewDurationSecond === opt.value" class="check-icon">✓</span>
        </div>
        <button class="sub-dialog-cancel" @click="showDurationDialog = false">取消</button>
      </div>
    </div>

    <!-- 指定免费观众 完整弹层 -->
    <div class="sub-dialog-mask" v-if="showFreeViewersDialog" @click.self="showFreeViewersDialog = false">
      <div class="sub-dialog sub-dialog-lg viewers-dialog">
        <div class="sub-dialog-title-row">
          <div class="sub-dialog-title">指定免费观众</div>
          <button class="sub-dialog-close" type="button" @click="showFreeViewersDialog = false" title="关闭">×</button>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <input
            v-model="viewerSearchKeyword"
            class="search-input"
            placeholder="搜索用户ID/用户号/用户昵称"
            @keyup.enter="handleViewerSearch"
          />
          <button class="search-btn" type="button" :disabled="viewerLoading" @click="handleViewerSearch">
            {{ viewerLoading ? '查询中...' : '查询' }}
          </button>
        </div>

        <!-- 列表 -->
        <div class="viewers-table">
          <div class="table-header">
            <div class="th th-check">
              <label class="check-box" :class="{ checked: isAllSelected }" @click.stop="toggleSelectAll">
                <span v-if="isAllSelected" class="check-mark">✓</span>
              </label>
            </div>
            <div class="th th-avatar">头像</div>
            <div class="th th-name">用户名</div>
            <div class="th th-contrib">贡献</div>
            <div class="th th-action">操作</div>
          </div>
          <div class="table-body" ref="viewerTableBodyRef">
            <div class="table-row" v-for="user in viewerList" :key="user.user_id">
              <div class="td td-check">
                <label
                  class="check-box"
                  :class="{ checked: isUserSelected(user.user_id), disabled: isUserAdded(user.user_id) || user.is_whitelist }"
                  @click.stop="toggleSelectUser(user)"
                >
                  <span v-if="isUserSelected(user.user_id)" class="check-mark">✓</span>
                </label>
              </div>
              <div class="td td-avatar">
                <img :src="getAvatar(user)" class="viewer-avatar" alt="" />
              </div>
              <div class="td td-name">
                <div class="viewer-name-line">
                  <span class="viewer-name">{{ user.nickname || `用户 ${user.user_id}` }}</span>
                  <span v-if="user.is_whitelist" class="official-badge">官方</span>
                </div>
                <div class="viewer-meta">贡献：<span class="contrib-value">{{ user.contribute || 0 }}</span> 心动</div>
              </div>
              <div class="td td-contrib">{{ user.contribute || 0 }}</div>
              <div class="td td-action">
                <button
                  v-if="!isUserAdded(user.user_id) && !user.is_whitelist"
                  class="add-btn"
                  type="button"
                  :disabled="viewerLoading"
                  @click="handleAddViewer(user)"
                >添加</button>
                <button
                  v-else-if="isUserAdded(user.user_id) && !user.is_whitelist"
                  class="add-btn remove"
                  type="button"
                  :disabled="viewerLoading"
                  @click="handleRemoveViewer(user)"
                >移除</button>
                <span v-else class="added-tag">官方</span>
              </div>
            </div>
            <!-- 空/加载 -->
            <div v-if="viewerLoading && viewerList.length === 0" class="empty-row">加载中...</div>
            <div v-else-if="!viewerLoading && viewerList.length === 0" class="empty-row">
              {{ viewerSearchKeyword.trim() ? '暂无匹配用户' : '暂无免费观众' }}
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="viewers-footer">
          <span class="footer-tip">
            已选 <span class="footer-tip-num">{{ selectedUserIds.size }}</span> 个 ·
            已添加 {{ addedViewers.length }} 位免费观众
          </span>
          <button class="footer-confirm-btn" type="button" :disabled="viewerLoading" @click="handleConfirmFreeViewers">
            完成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { uploadFile } from '../api/upload';
import {
  getPrepareLiveInfo,
  createPrepareLive,
  fetchLiveCategoryList,
  getFreeViewerWhitelist,
  searchFreeViewerWhitelist,
  addFreeViewerWhitelist,
  removeFreeViewerWhitelist,
  type LiveCategory,
  type PrepareLiveResult,
  type WhitelistUserItem,
} from '../api/live';
import { resolveImageUrl } from '../config';
import { showMessage, MessageToastType } from '../../TUILiveKit/base-component/MessageToast';
import vClickOutside from '../../TUILiveKit/utils/vClickOutside';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', v: boolean): void;
  (e: 'confirm', result: PrepareLiveResult & { liveTitle: string; coverUrl: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const categories = ref<LiveCategory[]>([]);
const uploading = ref(false);
const submitting = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const categoryDropdownOpen = ref(false);

const showDurationDialog = ref(false);
const showFreeViewersDialog = ref(false);

/* ---------- 指定免费观众（白名单）状态 ---------- */
// 已在白名单里的用户（从 anchorWhitelist 拉）
const addedViewers = ref<WhitelistUserItem[]>([]);
// 当前表格里展示的列表（搜索结果 OR 默认白名单）
const viewerList = ref<WhitelistUserItem[]>([]);
// 多选待批量添加的 Set
const selectedUserIds = ref<Set<string | number>>(new Set());
const viewerSearchKeyword = ref('');
const viewerLoading = ref(false);

// 打开弹层时：先拉已添加白名单，默认展示全部白名单候选
const handleOpenFreeViewers = async () => {
  if (!form.isCharge) return;
  showFreeViewersDialog.value = true;
  viewerSearchKeyword.value = '';
  selectedUserIds.value = new Set();
  viewerLoading.value = true;
  // 并行：回显已添加白名单 + 自动拉一次候选列表（空 keyword 拿默认全部）
  try {
    const [whitelistRes, searchRes] = await Promise.allSettled([
      getFreeViewerWhitelist({ page: 1, pageSize: 200 }),
      searchFreeViewerWhitelist({ keyword: 'N', page: 1, pageSize: 200 }),
    ]);

    // 1) 已添加白名单
    if (whitelistRes.status === 'fulfilled') {
      const arr = Array.isArray(whitelistRes.value) ? whitelistRes.value : [];
      addedViewers.value = arr;
      form.freeViewerCount = arr.length;
    } else {
      console.warn('[PreLive] getFreeViewerWhitelist failed:', whitelistRes.reason);
    }

    // 2) 候选列表：优先用 search 返回；如果 search 失败/空，则降级展示已添加白名单
    let candidates: WhitelistUserItem[] = [];
    if (searchRes.status === 'fulfilled') {
      candidates = Array.isArray(searchRes.value) ? searchRes.value : [];
    } else {
      console.warn('[PreLive] searchFreeViewerWhitelist failed:', searchRes.reason);
    }
    // 合并：search 结果里可能不含已添加但不在候选里的官方账号，补上
    if (candidates.length === 0) {
      viewerList.value = [...addedViewers.value];
    } else {
      const addedIds = new Set(addedViewers.value.map(u => String(u.user_id)));
      candidates.forEach(c => addedIds.delete(String(c.user_id)));
      viewerList.value = [...addedViewers.value.filter(u => addedIds.has(String(u.user_id))), ...candidates];
    }
  } catch (e) {
    console.warn('[PreLive] whitelist init failed:', e);
  } finally {
    viewerLoading.value = false;
  }
};

// 回车/点击查询 → 调 searchWhitelistUserList
const handleViewerSearch = async () => {
  const keyword = viewerSearchKeyword.value.trim();
  if (!keyword) {
    // 空关键字：恢复显示已添加白名单
    viewerList.value = [...addedViewers.value];
    return;
  }
  viewerLoading.value = true;
  try {
    const res = await searchFreeViewerWhitelist({ keyword, page: 1, pageSize: 200 });
    viewerList.value = Array.isArray(res) ? res : [];
  } catch (e) {
    console.warn('[PreLive] searchWhitelistUserList failed:', e);
    showMessage({ type: MessageToastType.Error, message: '搜索失败' });
  } finally {
    viewerLoading.value = false;
  }
};

// 用户是否已添加到白名单
const isUserAdded = (userId: string | number) =>
  addedViewers.value.some(u => String(u.user_id) === String(userId));

// 头像补全
const getAvatar = (user: WhitelistUserItem) => {
  if (!user.avatar) return '';
  return resolveImageUrl(user.avatar);
};

/* 多选（点 checkbox 切换） */
const toggleSelectUser = (user: WhitelistUserItem) => {
  if (isUserAdded(user.user_id) || user.is_whitelist) return; // 已添加/官方 不能勾选
  const id = String(user.user_id);
  const next = new Set(selectedUserIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedUserIds.value = next;
};

const isUserSelected = (userId: string | number) => selectedUserIds.value.has(String(userId));

const isAllSelected = computed(() => {
  const selectable = viewerList.value.filter(u => !isUserAdded(u.user_id) && !u.is_whitelist);
  if (!selectable.length) return false;
  return selectable.every(u => selectedUserIds.value.has(String(u.user_id)));
});

const toggleSelectAll = () => {
  const selectable = viewerList.value.filter(u => !isUserAdded(u.user_id) && !u.is_whitelist);
  if (!selectable.length) return;
  const next = new Set(selectedUserIds.value);
  if (isAllSelected.value) selectable.forEach(u => next.delete(String(u.user_id)));
  else selectable.forEach(u => next.add(String(u.user_id)));
  selectedUserIds.value = next;
};

/* 单个/批量添加 */
const handleAddViewer = async (user: WhitelistUserItem) => {
  if (isUserAdded(user.user_id)) return;
  viewerLoading.value = true;
  try {
    await addFreeViewerWhitelist({ appendUserId: String(user.user_id) });
    addedViewers.value.push(user);
    showMessage({ type: MessageToastType.Success, message: `已添加 ${user.nickname || user.user_id}` });
  } catch (e) {
    console.warn('[PreLive] addFreeViewerWhitelist failed:', e);
    showMessage({ type: MessageToastType.Error, message: '添加失败' });
  } finally {
    viewerLoading.value = false;
  }
};

const handleRemoveViewer = async (user: WhitelistUserItem) => {
  viewerLoading.value = true;
  try {
    await removeFreeViewerWhitelist({ removeUserId: String(user.user_id) });
    addedViewers.value = addedViewers.value.filter(u => String(u.user_id) !== String(user.user_id));
    selectedUserIds.value.delete(String(user.user_id));
    showMessage({ type: MessageToastType.Success, message: `已移除 ${user.nickname || user.user_id}` });
  } catch (e) {
    console.warn('[PreLive] removeFreeViewerWhitelist failed:', e);
    showMessage({ type: MessageToastType.Error, message: '移除失败' });
  } finally {
    viewerLoading.value = false;
  }
};

/* 点"完成"：把所有多选待批量添加的用户一次性 addAnchorWhitelist，然后关闭弹层 */
const handleConfirmFreeViewers = async () => {
  const pendingIds = Array.from(selectedUserIds.value).filter(id => !isUserAdded(id));
  if (pendingIds.length > 0) {
    viewerLoading.value = true;
    try {
      await addFreeViewerWhitelist({ appendUserId: pendingIds.join(',') });
      // 把刚添加的塞进 addedViewers（从 viewerList 取用户对象）
      pendingIds.forEach(idStr => {
        const user = viewerList.value.find(u => String(u.user_id) === idStr);
        if (user && !isUserAdded(idStr)) addedViewers.value.push(user);
      });
      showMessage({ type: MessageToastType.Success, message: `已批量添加 ${pendingIds.length} 位` });
    } catch (e) {
      console.warn('[PreLive] batch addFreeViewerWhitelist failed:', e);
      showMessage({ type: MessageToastType.Error, message: '添加失败' });
      return;
    } finally {
      viewerLoading.value = false;
    }
  }
  // 同步表单计数（开播设置弹窗底部"已指定 N 人"）
  form.freeViewerCount = addedViewers.value.length;
  selectedUserIds.value = new Set();
  showFreeViewersDialog.value = false;
};

const selectedCategoryName = computed(() => {
  if (!form.liveCategoryId) return '';
  return categories.value.find(c => c.id === form.liveCategoryId)?.name || '';
});

const selectCategory = (id: string | number) => {
  form.liveCategoryId = id;
  categoryDropdownOpen.value = false;
};

const closeCategoryDropdown = () => {
  categoryDropdownOpen.value = false;
};

const durationOptions = [
  { value: 30, label: '30 秒' },
  { value: 60, label: '1 分钟' },
  { value: 120, label: '2 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
];

const form = reactive({
  liveTitle: '',
  // 传给后端的封面 path（后端 createPrepareLive 用 path）
  liveCoverPath: '',
  // 显示用的完整封面 URL
  liveCoverUrl: '',
  liveCategoryId: '' as string | number,
  // 门票直播设置
  isCharge: false,
  ticketPrice: '' as string | number, // 用户输入的门票金额（字符串，提交前转 number）
  livePreviewEnabled: false,
  freePreviewDurationSecond: 60 as number,
  freeViewerCount: 0 as number,
});

// 门票金额显示（空串显示 ''，让 placeholder 生效）
const ticketPriceDisplay = computed(() =>
  form.ticketPrice === 0 || form.ticketPrice === '' ? '' : String(form.ticketPrice),
);

// 门票金额输入清洗：只允许数字 + 最多 2 位小数
const handleTicketPriceInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  let raw = input.value;
  // 只保留数字（N币是整数，不允许小数点）
  raw = raw.replace(/\D/g, '');
  // 去掉多余前导 0
  if (raw.length > 1) raw = raw.replace(/^0+/, '');
  input.value = raw;
  form.ticketPrice = raw;
};

// blur 时标准化：空 → 0；有值 → 整数
const handleTicketPriceBlur = () => {
  const raw = String(form.ticketPrice || '').trim();
  if (!raw) {
    form.ticketPrice = 0;
    return;
  }
  const num = Math.floor(Number(raw));
  if (Number.isNaN(num) || num < 0) {
    form.ticketPrice = 0;
    return;
  }
  form.ticketPrice = num;
};

// 免费预览时长显示（关闭直播预览时提示"需先开启"）
const freeDurationLabel = computed(() => {
  if (!form.isCharge) return '需先开启门票直播';
  if (!form.livePreviewEnabled) return '需先开启直播预览';
  const v = form.freePreviewDurationSecond;
  if (v === 0) return '不提供免费预览';
  if (v < 60) return `${v} 秒`;
  return `${Math.floor(v / 60)} 分钟`;
});

const freeViewersLabel = computed(() => {
  if (!form.isCharge) return '需先开启门票直播';
  const count = form.freeViewerCount || 0;
  if (count <= 0) return '不限制';
  return `已指定 ${count} 人`;
});

// 封面预览图（带图片域名补全）
const coverPreviewUrl = computed(() => resolveImageUrl(form.liveCoverUrl || form.liveCoverPath));

const handleClose = () => {
  if (submitting.value) return;
  emit('update:visible', false);
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!/image\/(jpeg|png)/.test(file.type)) {
    showMessage({ type: MessageToastType.Error, message: '仅支持 JPG/PNG 格式' });
    return;
  }
  if (file.size / 1024 / 1024 >= 2) {
    showMessage({ type: MessageToastType.Error, message: '图片大小不能超过 2M' });
    return;
  }
  uploading.value = true;
  uploadFile(file, '8').then((res) => {
    // 后端返回 url（可能完整或相对）和 path（相对路径）
    form.liveCoverUrl = res.url || '';
    form.liveCoverPath = res.path || res.url || '';
    showMessage({ type: MessageToastType.Success, message: '封面上传成功' });
  }).catch((err) => {
    showMessage({ type: MessageToastType.Error, message: err?.message || '封面上传失败' });
  }).finally(() => {
    uploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  });
};

/* ---------- 门票直播开关 ---------- */
const toggleIsCharge = () => {
  form.isCharge = !form.isCharge;
  // 关闭门票直播 → 自动关闭下游依赖开关 + 清空门票金额
  if (!form.isCharge) {
    form.livePreviewEnabled = false;
    form.freeViewerCount = 0;
    form.ticketPrice = 0;
  }
};

const toggleLivePreview = () => {
  if (!form.isCharge) return;
  form.livePreviewEnabled = !form.livePreviewEnabled;
};

const openFreeDurationPicker = () => {
  if (!form.isCharge || !form.livePreviewEnabled) return;
  showDurationDialog.value = true;
};

const selectDuration = (val: number) => {
  form.freePreviewDurationSecond = val;
  showDurationDialog.value = false;
};

/* ---------- 开播 ---------- */
const handleConfirm = async () => {
  if (!form.liveTitle.trim()) {
    showMessage({ type: MessageToastType.Warning, message: '请输入直播标题' });
    return;
  }
  if (!form.liveCategoryId) {
    showMessage({ type: MessageToastType.Warning, message: '请选择直播分类' });
    return;
  }
  submitting.value = true;
  try {
    const result = await createPrepareLive({
      liveTitle: form.liveTitle.trim(),
      liveCover: form.liveCoverPath || form.liveCoverUrl,
      isCharge: form.isCharge,
      orientation: 'landscape',
      liveCategoryId: form.liveCategoryId,
      // 门票直播相关字段：只在开启时传递
      ...(form.isCharge ? {
        ticketPrice: Number(form.ticketPrice || 0),
        isOpenLivePreview: form.livePreviewEnabled,
        freePreviewDurationSecond: form.livePreviewEnabled ? form.freePreviewDurationSecond : 0,
      } : {}),
    });
    emit('confirm', {
      ...result,
      liveTitle: form.liveTitle.trim(),
      coverUrl: coverPreviewUrl.value,
    });
    emit('update:visible', false);
  } catch (err: any) {
    showMessage({ type: MessageToastType.Error, message: err?.message || '预开播失败，请重试' });
  } finally {
    submitting.value = false;
  }
};

// 每次打开「开播设置」都拉取一次预开播信息，回显上一次的标题、封面与分类
const loadPrepareInfo = async () => {
  // 1) 先拉最新分类列表（/live/liveCategory，优先使用后端返回）
  try {
    const cats = await fetchLiveCategoryList();
    if (Array.isArray(cats) && cats.length > 0) {
      categories.value = cats;
    }
  } catch (e) {
    console.warn('[Niko] fetchLiveCategoryList failed:', e);
  }
  // 2) 拉预开播信息，做字段回显；若分类列表为空且后端返回了分类列表则兜底
  try {
    const info = await getPrepareLiveInfo();
    if (!categories.value.length && info?.live_category_list?.length) {
      categories.value = info.live_category_list;
    }
    if (info?.live_title) {
      form.liveTitle = info.live_title;
    }
    if (info?.live_cover) {
      form.liveCoverPath = info.live_cover;
      form.liveCoverUrl = info.live_cover;
    }
    if (info?.live_category_id) {
      form.liveCategoryId = info.live_category_id;
    }
    // 门票直播设置回显（后端字段 snake_case）
    if (typeof info?.is_charge === 'boolean') {
      form.isCharge = info.is_charge;
    }
    if (typeof info?.ticket_price === 'number') {
      form.ticketPrice = info.ticket_price;
    }
    if (typeof info?.is_open_live_preview === 'boolean') {
      form.livePreviewEnabled = info.is_open_live_preview;
    }
    if (typeof info?.free_preview_duration_second === 'number' && info.free_preview_duration_second > 0) {
      form.freePreviewDurationSecond = info.free_preview_duration_second;
    }
    if (typeof info?.free_viewer_count === 'number') {
      form.freeViewerCount = info.free_viewer_count;
    }
  } catch (e) {
    console.warn('[Niko] prepareLiveInfo failed:', e);
  }
  // 3) 拉白名单：保持 addedViewers / viewerList / freeViewerCount 最新
  try {
    const arr = await getFreeViewerWhitelist({ page: 1, pageSize: 200 });
    addedViewers.value = Array.isArray(arr) ? arr : [];
    form.freeViewerCount = addedViewers.value.length;
  } catch (e) {
    console.warn('[Niko] getAnchorWhitelist (loadPrepareInfo) failed:', e);
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadPrepareInfo();
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.prelive-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.prelive-dialog {
  width: 580px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #101013;
  border: 1px solid #232329;
  border-radius: 12px;
  overflow: hidden;
  color: #fff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.6);
}
.prelive-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #232329;
  flex-shrink: 0;
  .prelive-title { font-size: 16px; font-weight: 600; }
  .prelive-close {
    background: none; border: none; color: rgba(255,255,255,0.45); font-size: 22px; cursor: pointer;
    &:hover { color: #fff; }
  }
}
.prelive-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
  }
}
.prelive-field { margin-bottom: 16px; position: relative; }
.prelive-label { display: block; margin-bottom: 8px; font-size: 14px; color: rgba(255,255,255,0.6); }
.prelive-input, .prelive-select {
  width: 100%;
  padding: 8px 12px;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  outline: none;
  &:focus { border-color: #4a90d9; }
}
/* 自定义分类下拉（替代原生 select，以便精确控制选项间距） */
.prelive-select {
  padding: 10px 12px;
  line-height: 1.4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  &.is-open { border-color: #4a90d9; }
}
.prelive-select-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
}
.prelive-select:not(.has-value) .prelive-select-text {
  color: rgba(255, 255, 255, 0.4);
}
.prelive-select-arrow {
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}
.prelive-select-arrow.is-open {
  transform: rotate(180deg);
}
.prelive-dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  padding: 6px;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 10000;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.prelive-dropdown-item {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  margin: 2px 0;
  &:hover {
    background: rgba(74, 144, 217, 0.15);
    color: #fff;
  }
  &.is-selected {
    background: rgba(74, 144, 217, 0.25);
    color: #4a90d9;
  }
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.prelive-cover {
  width: 100%;
  min-height: 160px;
  background: #17171b;
  border: 1px dashed #26262c;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  &:hover { border-color: #4a90d9; }
}
.prelive-cover-img { width: 100%; height: auto; display: block; background: #000; }
.prelive-cover-placeholder {
  display: flex; flex-direction: column; align-items: center; color: rgba(255,255,255,0.35);
  .prelive-cover-tip { font-size: 12px; margin-top: 4px; }
}
.prelive-cover-loading {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
}
.prelive-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 20px; border-top: 1px solid #232329;
  flex-shrink: 0;
}
.prelive-btn {
  padding: 8px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px;
}
.prelive-btn-cancel { background: #232329; color: rgba(255,255,255,0.7); }
.prelive-btn-confirm {
  background: #4a90d9; color: #fff;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

/* ---------- 门票直播设置 ---------- */
.prelive-section-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 24px 0 10px;
  padding-left: 2px;
}
.prelive-settings-group {
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 8px;
  overflow: hidden;
}
.prelive-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #26262c;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.03); }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    &:hover { background: transparent; }
    .row-arrow, .row-value { color: rgba(255, 255, 255, 0.25) !important; }
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    .row-label { font-size: 14px; color: #fff; }
    .row-tag {
      font-size: 11px;
      color: #ffb0a0;
      background: rgba(255, 107, 107, 0.12);
      border: 1px solid rgba(255, 107, 107, 0.3);
      padding: 1px 6px;
      border-radius: 3px;
    }
  }

  .row-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .row-value {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.55);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-arrow {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.35);
      line-height: 1;
    }
  }

  /* 门票金额 inline 输入框 */
  .row-right-inline {
    flex-shrink: 1;
    min-width: 0;
    justify-content: flex-end;
  }
  .prelive-inline-input {
    width: 110px;
    padding: 6px 10px;
    background: #1f1f24;
    border: 1px solid #2e2e35;
    border-radius: 5px;
    color: #fff;
    font-size: 13px;
    text-align: right;
    outline: none;
    transition: border-color 0.15s;

    &::placeholder { color: rgba(255, 255, 255, 0.3); }
    &:focus { border-color: #4a90d9; }
    /* 去掉数字输入框原生 spinner（如果将来换 type=number） */
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
  .input-unit {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }
  /* inline 输入行不要 row 的默认 hover cursor/箭头 */
  .prelive-setting-row-inline {
    cursor: default;
    &:hover { background: transparent; }
  }
}

/* 自定义开关 */
.custom-switch {
  width: 44px;
  height: 24px;
  background: #2e2e35;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;

  .switch-dot {
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  &.is-on {
    background: #4a90d9;
    .switch-dot { left: 22px; }
  }
}

/* ---------- 子弹层：时长选择 / 免费观众 ---------- */
.sub-dialog-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 100;
}
.sub-dialog {
  width: 320px;
  background: #17171b;
  border: 1px solid #26262c;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);

  &.sub-dialog-sm { width: 280px; }
}
.sub-dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #26262c;
}
.sub-dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0; /* 不再单独居中 + 去掉默认 margin-bottom */
}
.sub-dialog-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
}
.sub-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  background: #1f1f24;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #26262c; }
  &.active {
    background: rgba(74, 144, 217, 0.2);
    color: #4a90d9;
  }
  .check-icon { color: #4a90d9; font-size: 14px; font-weight: 600; }
}
.sub-dialog-cancel {
  width: 100%;
  padding: 9px 0;
  margin-top: 6px;
  background: transparent;
  border: 1px solid #26262c;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  &:hover { border-color: #4a90d9; color: #fff; }
}
.empty-tip {
  text-align: center;
  padding: 24px 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
}

/* ---------- 指定免费观众 弹层 ---------- */
.viewers-dialog {
  width: 640px;
  max-width: 92vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.viewers-dialog .sub-dialog-title {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  background: #1f1f24;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  color: #fff;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  &::placeholder { color: rgba(255, 255, 255, 0.35); }
  &:focus { border-color: #4a90d9; }
}
.search-btn {
  padding: 8px 18px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #5aa0e9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.viewers-table {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #26262c;
  border-radius: 6px;
  background: #1f1f24;
  min-height: 240px;
}
.table-header {
  display: flex;
  padding: 10px 12px;
  background: #26262c;
  border-bottom: 1px solid #2e2e35;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}
.table-body {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
  min-height: 120px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
  }
}
.table-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #26262c;
  transition: background 0.1s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.03); }
}
.td, .th {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.th-check, .td-check { width: 32px; }
.th-avatar, .td-avatar { width: 40px; justify-content: center; }
.th-name, .td-name { flex: 1; min-width: 0; }
.th-contrib, .td-contrib { width: 72px; justify-content: flex-end; color: rgba(255,255,255,0.7); font-size: 13px; }
.th-action, .td-action { width: 80px; justify-content: center; }

.viewer-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  background: #2e2e35;
  flex-shrink: 0;
}
.viewer-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}
.viewer-name {
  font-size: 13px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.official-badge {
  font-size: 10px;
  color: #4a90d9;
  border: 1px solid rgba(74, 144, 217, 0.5);
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(74, 144, 217, 0.1);
}
.viewer-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 2px;
}
.contrib-value { color: #4a90d9; font-weight: 600; }

/* 复选框 */
.check-box {
  width: 16px;
  height: 16px;
  border: 1.5px solid #4a4a54;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover { border-color: #4a90d9; }
  &.checked {
    background: #4a90d9;
    border-color: #4a90d9;
  }
  &.disabled {
    cursor: not-allowed;
    opacity: 0.4;
    &:hover { border-color: #4a4a54; }
  }
  .check-mark {
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }
}

.add-btn {
  padding: 5px 14px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #5aa0e9; }
  &.remove { background: #ff6b6b; &:hover { background: #ff8585; } }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
}
.added-tag {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-row {
  padding: 36px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.viewers-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px 0;
  flex-shrink: 0;
}
.footer-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}
.footer-tip-num {
  color: #4a90d9;
  font-weight: 600;
}
.footer-confirm-btn {
  padding: 8px 28px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: #5aa0e9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>


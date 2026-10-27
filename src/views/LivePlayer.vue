<template>
  <UIKitProvider theme="dark">
    <div class="live-player-page">
      <header class="player-header tui-window-header">
        <div class="player-header-left">
          <button class="player-back" type="button" aria-label="返回" @click="handleBack">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class="player-title">{{ title || '直播间' }}</span>
        </div>
        <div class="player-header-right">
          <span class="player-viewers">{{ viewerCount }} 人观看</span>
          <div class="window-tool">
            <button class="window-tool-btn" type="button" @click="onMinimize">
              <svg-icon :icon="MinimizeIcon"></svg-icon>
            </button>
            <button class="window-tool-btn" type="button" @click="onToggleMaximize">
              <svg-icon v-if="!isMaximized" :icon="MaximizeIcon"></svg-icon>
              <svg-icon v-else :icon="MiniIcon"></svg-icon>
            </button>
            <button class="window-tool-btn" type="button" @click="onClose">
              <svg-icon :icon="CloseIcon"></svg-icon>
            </button>
          </div>
        </div>
      </header>

      <main class="player-body">
        <div class="player-stage">
          <video ref="videoEl" class="player-video" autoplay playsinline></video>

          <GiftEffect />

          <div v-if="errorText" class="player-status">{{ errorText }}</div>

          <div class="player-anchor">
            <img
              v-if="avatar && !avatarError"
              class="player-avatar"
              :src="avatar"
              alt=""
              @error="avatarError = true"
            />
            <span v-else class="player-avatar player-avatar-empty">{{ initial }}</span>
            <div class="player-anchor-info">
              <span class="player-anchor-name">{{ anchorName || '主播' }}</span>
              <span class="player-anchor-sub">{{ title }}</span>
            </div>
            <span class="player-live-badge">直播中</span>
          </div>

          <!-- 在线观众折叠组件 + 声音开关（视频右上角，同一行） -->
          <div class="player-top-right">
            <!-- 声音开关：点击切换静音/开启，图标随状态变化 -->
            <button
              class="player-sound-btn"
              type="button"
              :title="muted ? '开启声音' : '关闭声音'"
              :aria-label="muted ? '开启声音' : '关闭声音'"
              @click="toggleSound"
            >
              <!-- 有声状态 -->
              <template v-if="!muted">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </template>
              <!-- 静音状态 -->
              <template v-else>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </template>
            </button>

            <div class="player-audience">
              <button
                class="player-audience-toggle"
                type="button"
                @click="audiencePanelVisible = !audiencePanelVisible"
              >
                <span class="player-audience-avatars">
                  <template v-for="(member, idx) in audiencePreview" :key="member.userId || idx">
                    <img
                      v-if="member.avatar"
                      class="player-audience-avatar"
                      :src="member.avatar"
                      :style="{ zIndex: audiencePreview.length - idx }"
                      alt=""
                    />
                    <span
                      v-else
                      class="player-audience-avatar player-audience-avatar-initial"
                      :style="{ zIndex: audiencePreview.length - idx }"
                    >{{ (member.nickname || 'N').slice(0, 1).toUpperCase() }}</span>
                  </template>
                </span>
                <span class="player-audience-count">{{ audienceCountText }}人</span>
              </button>
              <div v-if="audiencePanelVisible" class="player-audience-panel" @click.stop>
                <div class="player-audience-panel-title">在线观众（{{ audienceMembers.length }}）</div>
                <div class="player-audience-list">
                  <div v-for="member in audienceMembers" :key="member.userId" class="player-audience-item">
                    <img v-if="member.avatar" class="player-audience-item-avatar" :src="member.avatar" alt="" />
                    <span v-else class="player-audience-item-avatar player-audience-item-initial">
                      {{ (member.nickname || 'N').slice(0, 1).toUpperCase() }}
                    </span>
                    <span class="player-audience-item-name">{{ member.nickname }}</span>
                  </div>
                  <div v-if="!audienceMembers.length" class="player-audience-empty">暂无在线观众</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="player-side">
          <LiveChatPanel
            v-if="imReady"
            :room-id="roomId"
            :live-index-id="liveIndexId"
            :welcome-name="anchorName"
            show-gift-button
            @open-gift="giftPanelVisible = true"
            @open-game="gamePanelVisible = true"
            @user-click="handleUserClick"
          />
          <div v-else class="player-side-hint">{{ chatHint }}</div>
        </aside>
      </main>

      <GiftPanel
        :visible="giftPanelVisible"
        :live-index-id="liveIndexId"
        @close="giftPanelVisible = false"
      />

      <GamePanel
        :visible="gamePanelVisible"
        @close="gamePanelVisible = false"
      />

      <UserInfoCard
        :visible="userCardVisible"
        :info="userCardInfo"
        :loading="userCardLoading"
        @close="userCardVisible = false"
      />
    </div>
  </UIKitProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UIKitProvider, TUIMessageBox } from '@tencentcloud/uikit-base-component-vue3';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';
import { TUILogin } from '@tencentcloud/tui-core-lite';
import SvgIcon from '../TUILiveKit/common/base/SvgIcon.vue';
import MaximizeIcon from '../TUILiveKit/common/icons/MaximizeIcon.vue';
import MinimizeIcon from '../TUILiveKit/common/icons/MinimizeIcon.vue';
import MiniIcon from '../TUILiveKit/common/icons/MiniIcon.vue';
import CloseIcon from '../TUILiveKit/common/icons/CloseIcon.vue';
import { USER_INFO_STORAGE_KEY } from '../TUILiveKit/utils/userInfoStorage';
import { resolveImageUrl } from '../niko/config';
import { createStreamPlayer, type StreamPlayerHandle } from '../niko/utils/flvPlayer';
import {
  joinLiveChat,
  leaveLiveChat,
  onLiveImMembers,
  onLiveImSystem,
  type LiveImMember,
  type LiveImSystemEvent,
} from '../niko/im/liveIm';
import { getAudienceCardInfo, type AudienceCardInfo } from '../niko/api/live';
import { fetchRecommendLiveList } from '../niko/api/live';
import LiveChatPanel from '../niko/components/LiveChatPanel.vue';
import GiftEffect from '../niko/components/GiftEffect.vue';
import GiftPanel from '../niko/components/GiftPanel.vue';
import GamePanel from '../niko/components/GamePanel.vue';
import UserInfoCard from '../niko/components/UserInfoCard.vue';

const route = useRoute();
const router = useRouter();

const title = String(route.query.liveTitle || '');
const anchorName = String(route.query.anchorName || '');
const viewerCount = String(route.query.viewerCount || '0');
const avatarRaw = String(route.query.avatar || '');
const avatar = avatarRaw ? resolveImageUrl(avatarRaw) : '';
// IM 群组 ID（后端 room_id）与直播场次 ID（live_index_id）
const roomId = String(route.query.roomId || '');
const liveIndexId = String(route.query.liveId || '');
// play_url 带签名参数，通过 history.state 传递（H5 项目同样做法）
const playUrl = String((window.history.state as Record<string, unknown> | null)?.playUrl || '');

const { login, loginUserInfo } = useLoginState();

const videoEl: Ref<HTMLVideoElement | null> = ref(null);
const errorText = ref('');
const muted = ref(true);
const avatarError = ref(false);
const initial = computed(() => (anchorName || 'N').slice(0, 1).toUpperCase());
const imReady = ref(false);
const chatHint = ref('聊天连接中...');
const giftPanelVisible = ref(false);
const gamePanelVisible = ref(false);
const userCardVisible = ref(false);
const userCardLoading = ref(false);
const userCardInfo: Ref<AudienceCardInfo | null> = ref(null);

// 在线观众折叠组件：群消息 audience_list 下发的成员列表（liveIm 内已做解析）
const audienceMembers = ref<LiveImMember[]>([]);
const audiencePanelVisible = ref(false);
// 叠层最多展示 5 个头像，多出的只体现在人数上
const audiencePreview = computed(() => audienceMembers.value.slice(0, 5));
const audienceCountText = computed(() => (
  audienceMembers.value.length > 0 ? String(audienceMembers.value.length) : viewerCount
));

let unsubscribeMembers: (() => void) | null = null;

let playerHandle: StreamPlayerHandle | null = null;
let unsubscribeSystem: (() => void) | null = null;
let destroyed = false;

/** 拉流错误连续计数：网络抖动 vs 真停播 */
let streamErrorCount = 0;
let streamErrorTimer: number | null = null;

/** 播放停滞兜底：直播流只要超过 1 秒没有新视频帧（currentTime 不推进），
 *  就等于流已断。CDN 在主播关播时常常「静默保活」——不报错也不断开连接，
 *  所以必须靠这个兜底，且阈值要短，否则观众要等很久才退出。 */
const STALL_TIMEOUT_MS = 1 * 1000;
let stallTimer: number | null = null;
let lastVideoTime = 0;
/** 是否真正开始过播放：避免首次缓冲阶段被误判成断流 */
let hasPlayedOnce = false;

/** 重置停滞计时器：每次收到新视频帧时调用 */
function resetStallTimer() {
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  // 还没真正出过画面（首帧缓冲中）不启用停滞判定
  if (!hasPlayedOnce) {
    return;
  }
  stallTimer = window.setTimeout(() => {
    if (destroyed) {
      return;
    }
    // 阈值内 currentTime 没任何推进 = 流已死
    if (videoEl.value && videoEl.value.currentTime === lastVideoTime) {
      console.warn('[LivePlayer] stall timeout: no new frames in', STALL_TIMEOUT_MS, 'ms, treating as stream ended');
      void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
    } else {
      // 还在推进，说明是我误判了，重开计时器
      resetStallTimer();
    }
  }, STALL_TIMEOUT_MS);
}

/** 等待指定毫秒（给弹框设置最长等待时间，避免 await 永久挂起） */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** 服务端权威下播判定：每 2 秒查一次在播列表（recommendLiveList，业务域），
 *  主播关播后房间会从列表里消失，连续 2 次消失即判定下播并退出。
 *  不依赖 flv.js 的错误事件 —— 实测 CDN 在主播关播时会静默保活连接，不报任何错。 */
const LIVE_STATUS_POLL_MS = 2 * 1000;
const LIVE_STATUS_PAGE_SIZE = 50;
let liveStatusTimer: number | null = null;
let missingFromListCount = 0;

function stopLiveStatusPoll() {
  if (liveStatusTimer !== null) {
    window.clearInterval(liveStatusTimer);
    liveStatusTimer = null;
  }
}

async function pollLiveStatus() {
  if (destroyed || !roomId) {
    return;
  }
  try {
    const result = await fetchRecommendLiveList(1, LIVE_STATUS_PAGE_SIZE, { force: true });
    if (destroyed) {
      return;
    }
    const exists = result.list.some(
      (item) => item.roomId === roomId || (liveIndexId !== '' && item.liveIndexId === liveIndexId),
    );
    // 只有返回不足一页的完整列表时，才能确定「不在列表里 == 已下播」
    const complete = result.list.length < LIVE_STATUS_PAGE_SIZE;
    if (exists || !complete) {
      missingFromListCount = 0;
      return;
    }
    missingFromListCount += 1;
    console.warn('[LivePlayer] room not in recommendLiveList, count:', missingFromListCount);
    if (missingFromListCount >= 2) {
      stopLiveStatusPoll();
      void exitRoom('直播已结束', '主播已结束直播', true);
    }
  } catch {
    // 接口异常不作为下播依据
    missingFromListCount = 0;
  }
}

function startLiveStatusPoll() {
  stopLiveStatusPoll();
  void pollLiveStatus();
  liveStatusTimer = window.setInterval(() => {
    void pollLiveStatus();
  }, LIVE_STATUS_POLL_MS);
}

/**
 * 退出直播间的统一入口。
 * 关键：弹框不能阻塞跳转 —— 弹窗宿主随页面卸载时 TUIMessageBox 的 Promise 可能永不
 * resolve，之前就是因此卡在直播间。这里用 race 限制最长等待，再强制跳转，并用 hash 兜底。
 * silent=true 时不弹框直接退出（拉流中断/关播检测这类不需要用户确认的场景）。
 */
async function exitRoom(title: string, message: string, silent = false) {
  if (destroyed) {
    return;
  }
  destroyed = true;
  stopLiveStatusPoll();
  // 退出直播间时关闭本次打开的游戏窗口
  try {
    window.ipcRenderer?.send('close-game-mobile', null);
  } catch {
    // 忽略 IPC 异常
  }
  // 离开 IM 群（异步，不阻塞退出流程）
  void leaveLiveChat();
  // 销毁播放器与停滞计时器
  playerHandle?.destroy();
  playerHandle = null;
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  if (!silent) {
    try {
      await Promise.race([
        TUIMessageBox({ title, message, confirmButtonText: '确定' }).catch(() => undefined),
        delay(1500),
      ]);
    } catch {
      // 用户关闭弹窗也一样退出
    }
  }
  try {
    await router.replace({ name: 'anchor-list' });
  } catch (error) {
    console.warn('[LivePlayer] router.replace failed:', error);
  }
  // 兜底：路由跳转未生效时直接改 hash，保证一定退回主播列表
  if (router.currentRoute.value.name !== 'anchor-list') {
    window.location.hash = '#/anchor-list';
  }
}

/**
 * 拉流错误处理：flv.js ERROR 事件现在传来的 detail 格式为
 * "[network] network-error {...}" / "[network] network-timeout {...}" 等。
 * Network / Media 类错误直接退出（停播时 CDN 会返回明确错误），
 * 其他格式错误等累计 3 次再退（给网络抖动留余地）。
 */
function handleStreamError(detail: string) {
  if (destroyed) {
    return;
  }
  const lower = String(detail).toLowerCase();
  // Network / Media / 404 / stream-not-found 都是「真的停播」
  const isTerminal = /\[network\]|\[media\]|network-error|network-timeout|media-error|media-format-error|stream.*not.*found|stream.*ended|live.*ended|notfound|404|loaderror/i.test(lower);
  errorText.value = '直播已结束或拉流失败';
  console.warn('[LivePlayer] stream error:', detail, '(terminal?', isTerminal, ')');

  if (isTerminal) {
    void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
    return;
  }
  // 非明确错误：累计 3 次才退出，避免网络抖动误判
  streamErrorCount++;
  if (streamErrorTimer) {
    clearTimeout(streamErrorTimer);
  }
  streamErrorTimer = window.setTimeout(() => {
    streamErrorCount = 0;
  }, 3000);
  if (streamErrorCount >= 3) {
    void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
  }
}

/**
 * 观看直播间需要 IM 登录 + 加入直播群：
 * - 主播列表页没有登录 IM，这里用本地登录凭据登录一次；
 * - 同一窗口内之后去开播时，TUILiveKitWin 会检测到已登录并复用会话，避免重复登录互踢。
 */
async function initChat() {
  if (!roomId) {
    chatHint.value = '聊天室信息缺失';
    return;
  }
  const stored = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
  if (!stored) {
    chatHint.value = '登录信息失效，请重新登录';
    return;
  }
  try {
    const { sdkAppId, userId, userSig } = JSON.parse(stored);
    // loginUserInfo 可能是旧会话残留，必须同时确认 chat 实例存在
    if (!loginUserInfo.value?.userId || !TUILogin.getContext()?.chat) {
      await login({
        sdkAppId: Number(sdkAppId),
        userId: String(userId),
        userSig: String(userSig),
      });
      console.log('[LivePlayer] TUIKit IM login success:', userId);
    }
    await joinLiveChat(roomId);
    console.log('[LivePlayer] live chat ready, roomId:', roomId);
    imReady.value = true;
  } catch (error: any) {
    console.error('[LivePlayer] init chat failed:', error?.message || error);
    chatHint.value = error?.message ? `聊天连接失败：${error.message}` : '聊天连接失败';
  }
}

/** 点击聊天室昵称/等级拉取用户卡片（对齐 web-obs-live 的 /live/audienceCardInfo） */
async function handleUserClick(payload: { userId: string; isMystery: boolean }) {
  if (!payload?.userId) {
    return;
  }
  userCardInfo.value = null;
  userCardVisible.value = true;
  userCardLoading.value = true;
  try {
    const result: any = await getAudienceCardInfo({
      audienceUserId: payload.userId,
      liveIndexId: liveIndexId || undefined,
    });
    const info = result?.audience_info || result?.data?.audience_info;
    if (info) {
      info.is_mystery = payload.isMystery;
      userCardInfo.value = info;
    } else {
      userCardVisible.value = false;
    }
  } catch (error: any) {
    console.warn('[LivePlayer] get audience card failed:', error?.message || error);
    userCardVisible.value = false;
  } finally {
    userCardLoading.value = false;
  }
}

/** 下播 / 禁播 / 封禁 / 警告（对齐 web-obs-live ChatRoom 的 53、118、system_aide） */
async function handleSystemEvent(event: LiveImSystemEvent) {
  if (event.kind === 'system' && !event.stop) {
    try {
      await TUIMessageBox({
        title: '系统提示',
        message: event.reason,
        confirmButtonText: '确定',
      });
    } catch {
      // 用户关闭弹窗
    }
    return;
  }
  if (event.kind === 'warning') {
    try {
      await TUIMessageBox({
        title: '警告',
        message: event.reason || '主播收到平台警告',
        confirmButtonText: '确定',
      });
    } catch {
      // 用户关闭弹窗
    }
    return;
  }
  if (!event.stop) {
    return;
  }
  const title = event.kind === 'ended' ? '直播已结束' : '封禁提示';
  const message = event.reason || (event.kind === 'ended' ? '主播已结束直播' : '直播间已被封禁');
  // 复用 exitRoom：弹框 + 离群 + 路由
  void exitRoom(title, message);
}

function toggleSound() {
  const el = videoEl.value;
  if (!el) {
    return;
  }
  el.muted = !el.muted;
  // 开启声音时重新 play()，否则某些浏览器不会出声
  if (!el.muted) {
    void el.play().catch(() => undefined);
  }
  muted.value = el.muted;
}

function handleBack() {
  router.push({ name: 'anchor-list' });
}

async function startPlayback() {
  const el = videoEl.value;
  if (!el) {
    return;
  }
  if (!playUrl) {
    errorText.value = '直播地址无效，请返回列表重新进入';
    return;
  }

  // 每次 timeupdate 都说明有新帧，重置停滞计时器
  const onTimeUpdate = () => {
    if (destroyed) {
      return;
    }
    lastVideoTime = el.currentTime;
    resetStallTimer();
  };
  el.addEventListener('timeupdate', onTimeUpdate);

  // 直播流结束（MSE 主动 endOfStream）→ 立即退出
  const onEnded = () => {
    if (destroyed) {
      return;
    }
    console.warn('[LivePlayer] video ended, treating as stream ended');
    void exitRoom('直播已结束', '主播已结束直播', true);
  };
  el.addEventListener('ended', onEnded);

  // 缓冲等待（waiting）：直播流断开时比 stalled 更早触发
  let waitingTimer: number | null = null;
  const clearWaitingTimer = () => {
    if (waitingTimer !== null) {
      window.clearTimeout(waitingTimer);
      waitingTimer = null;
    }
  };
  const onWaiting = () => {
    if (destroyed || !hasPlayedOnce) {
      return;
    }
    clearWaitingTimer();
    const startTime = el.currentTime;
    waitingTimer = window.setTimeout(() => {
      waitingTimer = null;
      if (destroyed) {
        return;
      }
      // 1 秒内还没恢复播放（currentTime 仍未推进）→ 判定断流
      if (el.currentTime === startTime) {
        console.warn('[LivePlayer] waiting timeout: 1s no progress, treating as stream ended');
        void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
      }
    }, 1 * 1000);
  };
  const onPlaying = () => {
    hasPlayedOnce = true;
    clearWaitingTimer();
  };
  el.addEventListener('waiting', onWaiting);
  el.addEventListener('playing', onPlaying);

  const cleanupVideoListeners = () => {
    el.removeEventListener('timeupdate', onTimeUpdate);
    el.removeEventListener('ended', onEnded);
    el.removeEventListener('waiting', onWaiting);
    el.removeEventListener('playing', onPlaying);
    clearWaitingTimer();
  };

  try {
    const handle = await createStreamPlayer(el, playUrl, {
      muted: false,
      onError: handleStreamError,
      onVideoError: (err) => {
        if (destroyed) {
          return;
        }
        const code = err?.code ?? 'unknown';
        console.warn('[LivePlayer] video element error, code:', code);
        errorText.value = '直播已结束或拉流失败';
        // MEDIA_ERR_SRC_NOT_SUPPORTED / NETWORK_ERR 都是真的停播
        if (code === 4 || code === 2 || code === 1) {
          void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
        }
      },
      onStalled: () => {
        if (destroyed) {
          return;
        }
        console.warn('[LivePlayer] video stalled');
        errorText.value = '直播已结束或拉流失败';
        // stalled 后 1 秒内没恢复则退出
        const stalledTimer = window.setTimeout(() => {
          if (!destroyed) {
            void exitRoom('直播已结束', '主播已结束直播或网络连接中断', true);
          }
        }, 1 * 1000);
        // 恢复播放时取消这个 timer
        const onStalledRecovered = () => {
          window.clearTimeout(stalledTimer);
          el.removeEventListener('playing', onStalledRecovered);
        };
        el.addEventListener('playing', onStalledRecovered);
      },
    });
    // 播放器初始化期间页面已退出时立即回收
    if (destroyed) {
      handle.destroy();
      cleanupVideoListeners();
      return;
    }
    playerHandle = handle;
    // 自动播放被拦截时会自动静音，这里同步按钮状态
    muted.value = el.muted;
    // 启动停滞兜底计时器
    lastVideoTime = el.currentTime;
    resetStallTimer();
    console.log('[LivePlayer] stall watchdog started, timeout:', STALL_TIMEOUT_MS, 'ms');
  } catch (error) {
    console.error('[LivePlayer] play failed:', error);
    errorText.value = '直播播放失败';
    cleanupVideoListeners();
    // 初始化就失败（URL 无效 / 404）直接退出
    void exitRoom('直播已结束', '主播已结束直播或直播地址无效', true);
  }
}

/* ---------------- 窗口控制 ---------------- */
const isMaximized: Ref<boolean> = ref(false);

function onMinimize() {
  window.ipcRenderer.send('on-minimize-window', null);
}

function onToggleMaximize() {
  isMaximized.value = !isMaximized.value;
  window.ipcRenderer.send('on-maximize-window', isMaximized.value);
}

function onClose() {
  window.ipcRenderer.send('on-close-window', null);
}

onMounted(() => {
  unsubscribeSystem = onLiveImSystem((event) => {
    void handleSystemEvent(event);
  });
  unsubscribeMembers = onLiveImMembers((members) => {
    audienceMembers.value = members;
  });
  void startPlayback();
  void initChat();
  // 每 2 秒对比在播列表，主播关播后 2~4 秒内必定退出（不依赖拉流错误事件）
  startLiveStatusPoll();
});

onBeforeUnmount(() => {
  destroyed = true;
  stopLiveStatusPoll();
  // 离开直播间（含手动点返回）时关闭本次打开的游戏窗口
  try {
    window.ipcRenderer?.send('close-game-mobile', null);
  } catch {
    // 忽略 IPC 异常
  }
  if (streamErrorTimer) {
    clearTimeout(streamErrorTimer);
    streamErrorTimer = null;
  }
  streamErrorCount = 0;
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
  lastVideoTime = 0;
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  unsubscribeMembers?.();
  unsubscribeMembers = null;
  playerHandle?.destroy();
  playerHandle = null;
  // 退出直播间时离开 IM 群；保留 IM 登录态，去开播时直接复用同一会话
  void leaveLiveChat();
});
</script>

<style lang="scss" scoped>
.live-player-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  color: var(--text-color-primary, #ffffff);
  background-color: #0b0b0d;
  box-sizing: border-box;
}

.player-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2.75rem;
  padding: 0 1rem;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  background-color: var(--bg-color-topbar, #141518);
}

.player-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  -webkit-app-region: no-drag;

  .player-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    color: #fff;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 0.25rem;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .player-title {
    font-size: 0.875rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.player-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  -webkit-app-region: no-drag;

  .player-viewers {
    font-size: 0.75rem;
    color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  }

  .window-tool {
    display: flex;
    align-items: center;

    .window-tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      margin: 0;
      color: #fff;
      cursor: pointer;
      background: transparent;
      border: none;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.player-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background-color: #000;
}

.player-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #000;
}

.player-side {
  flex: none;
  width: 20rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color-topbar, #141518);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.player-side-hint {
  margin: auto;
  padding: 0 1rem;
  font-size: 0.75rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
}

.player-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.player-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: #fff;
  border-radius: 0.375rem;
  background-color: rgba(0, 0, 0, 0.6);
}

.player-anchor {
  position: absolute;
  left: 1rem;
  top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 1.25rem;
  background-color: rgba(0, 0, 0, 0.45);

  .player-avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.15);
  }

  .player-avatar-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
  }

  .player-anchor-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .player-anchor-name {
    font-size: 0.8125rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-anchor-sub {
    max-width: 16rem;
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-live-badge {
    flex: none;
    padding: 0 0.375rem;
    font-size: 0.625rem;
    line-height: 1rem;
    color: #fff;
    border-radius: 0.125rem;
    background-color: #f04142;
  }
}

/* ==================== 视频右上角容器（声音 + 在线观众） ==================== */
.player-top-right {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-sound-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s ease, transform 0.12s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
  }

  &:active {
    transform: scale(0.92);
  }
}

/* ==================== 在线观众折叠组件 ==================== */
.player-audience {
  position: relative;
}

.player-audience-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.625rem 0 0.375rem;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
  }
}

.player-audience-avatars {
  display: flex;
  align-items: center;
}

.player-audience-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(0, 0, 0, 0.6);
  box-sizing: border-box;

  & + .player-audience-avatar {
    margin-left: -0.5rem;
  }
}

.player-audience-avatar-initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
  background-color: var(--uikit-color-primary, #2b7fff);
}

.player-audience-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.player-audience-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 13rem;
  max-height: 18rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: rgba(20, 21, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.625rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.player-audience-panel-title {
  padding: 0.625rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.player-audience-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.375rem 0;
}

.player-audience-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
}

.player-audience-item-avatar {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  background-color: rgba(255, 255, 255, 0.12);
}

.player-audience-item-initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
}

.player-audience-item-name {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-audience-empty {
  padding: 1.25rem 0;
  font-size: 0.75rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
}
</style>

import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ipcBridge,
  IPCMessageType,
  type ConfirmDialogActionPayload,
} from '../ipc';
import { TUIButtonActionType } from '../types';

const ROUTE_NAME_LIVE_KIT_MAC = 'tui-livekit-mac';
const ROUTE_NAME_LIVE_KIT_MAIN = 'tui-live-kit-main';

/**
 * 非直播页关闭确认：走独立 confirm BrowserWindow 渲染的 TUIDialog，
 * 与主播开播关闭触发的弹窗完全一致（同款 TUIDialog + 同款交互按钮）。
 *
 * 链路：
 *  main close → initiateQuitSequence → 发 app-request-quit 到渲染进程
 *  → 本 hook 拦截 → ipcBridge.sendToConfirm(SHOW_CONFIRM_DIALOG, scene='app-quit')
 *  → confirm 窗口渲染 TUIDialog → 用户点击 → confirm 窗口发 CONFIRM_DIALOG_ACTION 回 main
 *  → 本 hook 收到 → 根据 action 发 app-quit-confirmed / app-quit-cancel 给主进程
 */
export function useAppRequestQuit() {
  const router = useRouter();
  const currentDialogId = ref('');

  const handleAppRequestQuit = () => {
    const currentRouteName = String(router.currentRoute.value.name || '');
    if (currentRouteName === ROUTE_NAME_LIVE_KIT_MAC || currentRouteName === ROUTE_NAME_LIVE_KIT_MAIN) {
      // 直播间页面：交给 TUILiveKit 内部处理（showAppQuitConfirmWindow）
      return;
    }
    // 避免重复弹窗
    if (currentDialogId.value) {
      return;
    }

    // 非直播页：走 confirm 窗口（TUIDialog），与直播页样式统一
    const dialogId = `app-quit-${Date.now()}`;
    currentDialogId.value = dialogId;

    ipcBridge.sendToConfirm(IPCMessageType.SHOW_CONFIRM_DIALOG, {
      scene: 'app-quit',
      dialogId,
      title: '确定要退出 Niko直播 吗？',
      content: '退出后如需继续使用，请重新打开应用。',
      actions: [
        { text: '取消', value: 'cancel', type: TUIButtonActionType.Normal },
        { text: '确定', value: 'confirm', type: TUIButtonActionType.Dangerous },
      ],
    });
  };

  const handleConfirmDialogAction = (payload: ConfirmDialogActionPayload) => {
    if (payload?.scene !== 'app-quit') {
      return;
    }
    // 只处理自己发出的弹窗
    if (payload.dialogId && currentDialogId.value && payload.dialogId !== currentDialogId.value) {
      return;
    }

    const dialogId = payload.dialogId || currentDialogId.value || undefined;
    ipcBridge.sendToConfirm(IPCMessageType.CLOSE_CONFIRM_DIALOG, {
      scene: payload.scene,
      dialogId,
    });

    currentDialogId.value = '';

    if (payload.action === 'confirm') {
      window.ipcRenderer?.send('app-quit-confirmed');
    } else {
      window.ipcRenderer?.send('app-quit-cancel');
    }
  };

  onMounted(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('app-request-quit', handleAppRequestQuit);
    }
    ipcBridge.on(IPCMessageType.CONFIRM_DIALOG_ACTION, handleConfirmDialogAction);
  });

  onBeforeUnmount(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.off('app-request-quit', handleAppRequestQuit);
    }
    ipcBridge.off(IPCMessageType.CONFIRM_DIALOG_ACTION, handleConfirmDialogAction);
  });
}

import { createVNode, render } from 'vue';

import TUIMessageBox from './index.vue';

export type MessageProps = {
    title?: string,
    message: string,
    callback?: () => Promise<void>,
    confirmButtonText?: string,
    cancelButtonText?: string;
    cancelCallback?: () => Promise<void>;
    customClass?: string;
    timeout?: number;
}
const MessageBox = ({ title, message, callback, confirmButtonText, cancelButtonText, cancelCallback, customClass, timeout }: MessageProps) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const onRemove = () => {
    render(null, container);
    document.body.removeChild(container);
  };

  const vnode = createVNode(TUIMessageBox, {
    title,
    message,
    callback,
    confirmButtonText,
    cancelButtonText,
    cancelCallback,
    customClass,
    timeout,
    remove: onRemove,
  });
  render(vnode, container);
};

export default MessageBox;

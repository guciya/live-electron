// 极验4.0 验证码类型声明

export interface GeetestValidateData {
  lot_number: string;
  captcha_output: string;
  pass_token: string;
  gen_time: string;
}

export interface GeetestConfig {
  captchaId: string;
  product?: 'popup' | 'bind' | 'float';
  riskType?: 'ai' | 'slide';
  protocol?: 'http' | 'https';
  language?: string;
  timeout?: number;
  userInfo?: string;
  [key: string]: unknown;
}

export interface GeetestInstance {
  appendTo: (element: HTMLElement) => GeetestInstance;
  showCaptcha: () => void;
  reset: () => void;
  destroy: () => void;
  getValidate: () => GeetestValidateData;
  onReady: (cb: () => void) => GeetestInstance;
  onSuccess: (cb: () => void) => GeetestInstance;
  onError: (cb: (e: unknown) => void) => GeetestInstance;
}

export interface InitGeetest4 {
  (config: GeetestConfig, callback: (instance: GeetestInstance) => void): void;
}

declare global {
  interface Window {
    initGeetest4: InitGeetest4;
  }
}

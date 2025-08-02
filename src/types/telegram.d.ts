/**
 * Типы для Telegram WebApp
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
}

interface TelegramWebAppBackButton {
  isVisible: boolean;
  onClick: (callback: Function) => void;
  offClick: (callback: Function) => void;
  show: () => void;
  hide: () => void;
}

interface TelegramWebAppMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: Function) => void;
  offClick: (callback: Function) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive: boolean) => void;
  hideProgress: () => void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (eventType: string, eventHandler: Function) => void;
  offEvent: (eventType: string, eventHandler: Function) => void;
  sendData: (data: any) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: any, callback: Function) => void;
  showAlert: (message: string, callback: Function) => void;
  showConfirm: (message: string, callback: Function) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  BackButton: TelegramWebAppBackButton;
  MainButton: TelegramWebAppMainButton;
  HapticFeedback: {
    impactOccurred: (style: string) => void;
    notificationOccurred: (type: string) => void;
    selectionChanged: () => void;
  };
}

interface Telegram {
  WebApp: TelegramWebApp;
}

// Расширяем глобальный объект window
declare global {
  interface Window {
    Telegram: Telegram;
  }
} 
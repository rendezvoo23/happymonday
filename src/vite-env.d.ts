/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

type TelegramUser = {
  allows_write_to_pm: boolean;
  first_name: string;
  id: number;
  is_premium: boolean;
  language_code: string;
  last_name: string;
  photo_url: string;
  username: string;
};

interface TelegramSettingsButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, unknown> & { user: TelegramUser };
  HapticFeedback?: {
    impactOccurred: (
      style: "light" | "medium" | "heavy" | "rigid" | "soft"
    ) => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  SettingsButton: TelegramSettingsButton;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes: () => void;
  enableVerticalSwipes: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  version?: string;
  platform?: string;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

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
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes: () => void;
  enableVerticalSwipes: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  version?: string;
  platform?: string;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

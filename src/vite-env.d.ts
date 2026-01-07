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
  ready: () => void;
  // Add other methods if needed
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

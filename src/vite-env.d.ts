/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface TelegramWebApp {
    initData: string;
    ready: () => void;
    // Add other methods if needed
}

interface Window {
    Telegram?: {
        WebApp: TelegramWebApp;
    };
}


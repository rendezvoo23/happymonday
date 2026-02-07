import { Spinner } from "@/components/spinner";
import { DrawerManager } from "@/components/ui/drawer";
import { env } from "@/env";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { authenticateWithTelegram } from "@/lib/authTelegram";
import { supabase } from "@/lib/supabaseClient";
import { parseInitData } from "@/lib/utils";
import { useUserStore } from "@/stores/userStore";
import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";

// Lazy load devtools
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);
const TanStackRouterDevtools = lazy(() =>
  import("@tanstack/router-devtools").then((m) => ({
    default: m.TanStackRouterDevtools,
  }))
);

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { loadProfile, loadSettings, loadCurrencies } = useUserStore();
  const [, setUser] = useLocalStorage<{
    name: string;
    email: string;
    joinDate: string;
    avatarUrl?: string;
  } | null>("finance-pwa-user", null);

  useEffect(() => {
    const initAuth = async () => {
      setIsAuthLoading(true);
      setAuthError(null);

      // Strict Telegram Check
      if (!window.Telegram?.WebApp?.initData && !env.isDev) {
        setAuthError("Please open this application in Telegram.");
        setIsAuthLoading(false);
        return;
      }

      if (env.isDev) {
        let settingsButtonCallback: (() => void) | null = null;
        let backButtonCallback: (() => void) | null = null;
        const eventCallbacks: Record<string, (() => void) | null> = {};

        window.Telegram = {
          WebApp: {
            initData: env.devInitData,
            initDataUnsafe: parseInitData(env.devInitData),
            BackButton: {
              isVisible: false,
              onClick: (callback: () => void) => {
                console.log("Telegram BackButton onClick (mocked)");
                backButtonCallback = callback;
              },
              offClick: (callback: () => void) => {
                console.log("Telegram BackButton offClick (mocked)");
                if (backButtonCallback === callback) {
                  backButtonCallback = null;
                }
              },
              show() {
                console.log("Telegram BackButton show (mocked)");
                this.isVisible = true;
              },
              hide() {
                console.log("Telegram BackButton hide (mocked)");
                this.isVisible = false;
              },
            },
            SettingsButton: {
              isVisible: false,
              show() {
                console.log("Telegram SettingsButton show (mocked)");
                this.isVisible = true;
              },
              hide() {
                console.log("Telegram SettingsButton hide (mocked)");
                this.isVisible = false;
              },
              onClick(callback: () => void) {
                console.log("Telegram SettingsButton onClick (mocked)");
                settingsButtonCallback = callback;
              },
              offClick(callback: () => void) {
                console.log("Telegram SettingsButton offClick (mocked)");
                if (settingsButtonCallback === callback) {
                  settingsButtonCallback = null;
                }
              },
            },
            onEvent(eventType: string, callback: () => void) {
              console.log("Telegram WebApp onEvent (mocked):", eventType);
              eventCallbacks[eventType] = callback;
              if (eventType === "settings_button_pressed") {
                settingsButtonCallback = callback;
              }
            },
            offEvent(eventType: string, callback: () => void) {
              console.log("Telegram WebApp offEvent (mocked):", eventType);
              if (eventCallbacks[eventType] === callback) {
                delete eventCallbacks[eventType];
                if (eventType === "settings_button_pressed") {
                  settingsButtonCallback = null;
                }
              }
            },
            ready() {
              console.log("Telegram WebApp ready (mocked)");
            },
            expand() {
              console.log("Telegram WebApp expand (mocked)");
            },
            disableVerticalSwipes() {
              console.log("Telegram WebApp disableVerticalSwipes (mocked)");
            },
            enableVerticalSwipes() {
              console.log("Telegram WebApp enableVerticalSwipes (mocked)");
            },
            openLink(url: string) {
              console.log("Telegram WebApp openLink (mocked):", url);
              window.open(url, "_blank");
            },
            openTelegramLink(url: string) {
              console.log("Telegram WebApp openTelegramLink (mocked):", url);
              window.open(url, "_blank");
            },
            openInvoice(url: string, callback?: (status: string) => void) {
              console.log("Telegram WebApp openInvoice (mocked):", url);
              const shouldSucceed = window.confirm(
                `Mock Payment\n\nURL: ${url}\n\nClick OK to simulate successful payment, Cancel for failed payment.`
              );
              if (callback) {
                setTimeout(() => {
                  callback(shouldSucceed ? "paid" : "failed");
                }, 500);
              }
            },
            setHeaderColor(color: string) {
              console.log("Telegram WebApp setHeaderColor (mocked):", color);
            },
            setBackgroundColor(color: string) {
              console.log(
                "Telegram WebApp setBackgroundColor (mocked):",
                color
              );
            },
            version: "7.0",
            platform: "web",
          },
        };

        const handleKeyPress = (e: KeyboardEvent) => {
          if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            console.log("Dev: Triggering settings_button_pressed event");
            settingsButtonCallback?.();
          }
        };
        window.addEventListener("keydown", handleKeyPress);

        console.log("window.Telegram [mocked]", window.Telegram);
        console.log("Dev tip: Press Cmd/Ctrl+S to trigger settings button");
      }

      const success = await authenticateWithTelegram();

      if (success) {
        const {
          data: { user: sbUser },
        } = await supabase.auth.getUser();

        if (sbUser) {
          const telegramUser = window?.Telegram?.WebApp?.initDataUnsafe?.user;
          console.log("telegramUser", telegramUser);
          setUser({
            name: `${telegramUser?.first_name} ${telegramUser?.last_name}`,
            email: sbUser.email || "",
            joinDate: sbUser.created_at,
            avatarUrl: telegramUser?.photo_url,
          });
        }

        // Load user data globally
        await Promise.all([loadProfile(), loadSettings(), loadCurrencies()]);

        setIsAuthLoading(false);
      } else {
        setAuthError("Authentication with Telegram failed.");
        setIsAuthLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Disable Telegram swipe-to-close behavior for the entire app
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.disableVerticalSwipes();
      window.Telegram.WebApp.expand();
    }

    return () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.enableVerticalSwipes();
      }
    };
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 transition-colors duration-200">
        <div className="text-center text-red-600 dark:text-red-400">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-gray-900 dark:text-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Outlet />
      <DrawerManager />
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </div>
  );
}

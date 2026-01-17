import { LocalizationExample } from "@/components/examples/LocalizationExample";
import { ThemeExample } from "@/components/examples/ThemeExample";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { authenticateWithTelegram } from "@/lib/authTelegram";
import { supabase } from "@/lib/supabaseClient";
import { parseInitData } from "@/lib/utils";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { useUserStore } from "@/stores/userStore";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { env } from "./env";

function ProtectedRoute({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  const [user] = useLocalStorage("finance-pwa-user", null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // In Telegram-only mode, if we aren't authenticated and loading is done,
    // it means auth failed. We shouldn't redirect to /auth because it doesn't exist.
    // The App component handles the error state.
    // If we reach here, it might be a weird state, but let's just show nothing or a specific message.
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { loadProfile, loadSettings, loadCurrencies } = useUserStore();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setUser] = useLocalStorage<{
    name: string;
    email: string;
    joinDate: string;
    avatarUrl?: string;
  } | null>("finance-pwa-user", null);

  const showBottomNav =
    location.pathname !== "/" &&
    !location.pathname.startsWith("/add") &&
    !location.pathname.startsWith("/edit") &&
    !location.pathname.startsWith("/examples");

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
        const eventCallbacks: Record<string, (() => void) | null> = {};

        window.Telegram = {
          WebApp: {
            initData: env.devInitData,
            initDataUnsafe: parseInitData(env.devInitData),
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

              // For settings_button_pressed, connect to SettingsButton callback
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
              // Simulate payment flow in dev mode
              const shouldSucceed = window.confirm(
                `Mock Payment\n\nURL: ${url}\n\nClick OK to simulate successful payment, Cancel for failed payment.`
              );
              if (callback) {
                setTimeout(() => {
                  callback(shouldSucceed ? "paid" : "failed");
                }, 500);
              }
            },
            version: "7.0",
            platform: "web",
          },
        };

        // Add keyboard shortcut to trigger settings button in dev mode
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

      const success = authenticateWithTelegram();

      // We can treat the promise result
      if (await success) {
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

    // Always run auth check on mount to ensure valid session
    initAuth();
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-200">
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/history"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <AddTransactionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <EditTransactionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examples/localization"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <LocalizationExample />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examples/theme"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <ThemeExample />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {showBottomNav && <BottomNav />}
    </div>
  );
}

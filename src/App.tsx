import { BottomNav } from "@/components/layout/BottomNav";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { authenticateWithTelegram } from "@/lib/authTelegram";
import { supabase } from "@/lib/supabaseClient";
import { parseInitData } from "@/lib/utils";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { AiPage } from "@/pages/AiPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { HomePage } from "@/pages/HomePage";
import { LandingPage } from "@/pages/LandingPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

const DEV_MODE = false;
const DEV_INIT_DATA = "user=%7B%22id%22%3A795760041%2C%22first_name%22%3A%22rndzvoo%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22rndzvoo%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FHrpxMrlN4QU5YJd0SpJKg-fLsaAEgzbp1Yr5suG_boE.svg%22%7D&chat_instance=5721725468243331563&chat_type=private&auth_date=1767902731&signature=6Rfzj06u1cTsIGSLsAvU_tfb2DQ3aDzBtS7_7fYlpS1j0NtTUSDfsP6bkeE2R2p5UJpz74KmmCYUN7BxtENGAg&hash=92fcf538945320398f68358630472b28ce768049c5b2264318694d2dc26cd212";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        Loading...
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    !location.pathname.startsWith("/edit");

  useEffect(() => {
    const initAuth = async () => {
      setIsAuthLoading(true);
      setAuthError(null);

      // Strict Telegram Check
      if (!window.Telegram?.WebApp?.initData && !DEV_MODE) {
        setAuthError("Please open this application in Telegram.");
        setIsAuthLoading(false);
        return;
      }

      if (DEV_MODE) {
        window.Telegram = {
          WebApp: {
            initData: DEV_INIT_DATA,
            initDataUnsafe: parseInitData(DEV_INIT_DATA),
            ready() {},
          },
        };

        console.log("window.Telegram [mocked]", window.Telegram);

        setIsAuthLoading(false);
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
            name: telegramUser?.first_name + " " + telegramUser?.last_name,
            email: sbUser.email || "",
            joinDate: sbUser.created_at,
            avatarUrl: telegramUser?.photo_url,
          });
        }
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
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-900 font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
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
            path="/ai"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <AiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isLoading={isAuthLoading}>
                <ProfilePage />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {showBottomNav && <BottomNav />}
    </div>
  );
}


import { useEffect, useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomePage } from "@/pages/HomePage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { AiPage } from "@/pages/AiPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { LandingPage } from "@/pages/LandingPage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { authenticateWithTelegram } from "@/lib/authTelegram";
import { supabase } from "@/lib/supabaseClient";

function ProtectedRoute({ children, isLoading }: { children: React.ReactNode, isLoading: boolean }) {
    const [user] = useLocalStorage("finance-pwa-user", null);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
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

    const showBottomNav = location.pathname !== "/" &&
        !location.pathname.startsWith("/add") &&
        !location.pathname.startsWith("/edit");

    useEffect(() => {
        const initAuth = async () => {
            setIsAuthLoading(true);
            setAuthError(null);

            // Strict Telegram Check
            if (!window.Telegram?.WebApp?.initData) {
                setAuthError("Please open this application in Telegram.");
                setIsAuthLoading(false);
                return;
            }

            const success = authenticateWithTelegram();

            // We can treat the promise result
            if (await success) {
                const { data: { user: sbUser } } = await supabase.auth.getUser();
                if (sbUser) {
                    setUser({
                        name: "Telegram User",
                        email: sbUser.email || "",
                        joinDate: sbUser.created_at,
                        avatarUrl: undefined
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
    }, [setUser]);

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


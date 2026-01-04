import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomePage } from "@/pages/HomePage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { AiPage } from "@/pages/AiPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AuthPage } from "@/pages/AuthPage";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { LandingPage } from "@/pages/LandingPage";
import { useLocalStorage } from "@/hooks/useLocalStorage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [user] = useLocalStorage("finance-pwa-user", null);

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    const location = useLocation();
    const showBottomNav = location.pathname !== "/" &&
        location.pathname !== "/auth" &&
        !location.pathname.startsWith("/add") &&
        !location.pathname.startsWith("/edit");

    return (
        <div className="min-h-screen bg-background text-gray-900 font-sans overflow-hidden">
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<LandingPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <HomePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/statistics"
                        element={
                            <ProtectedRoute>
                                <StatisticsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ai"
                        element={
                            <ProtectedRoute>
                                <AiPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/add"
                        element={
                            <ProtectedRoute>
                                <AddTransactionPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/edit/:id"
                        element={
                            <ProtectedRoute>
                                <EditTransactionPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AnimatePresence>

            {showBottomNav && <BottomNav />}
        </div>
    );
}

import type * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, ChevronRight, Bell, DollarSign, Globe, Check } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useUserStore } from "@/stores/userStore";
import { supabase } from "@/lib/supabaseClient";

export function ProfilePage() {
    const navigate = useNavigate();
    const { profile, settings, currencies, updateSettings, isLoading } = useUserStore();
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

    // Data loading is handled globally in App.tsx
    useEffect(() => {
        // We can still trigger re-loads if needed, but App.tsx ensures initial data is there.
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    const handleCurrencySelect = async (code: string) => {
        await updateSettings({ default_currency: code });
        setIsCurrencyModalOpen(false);
    };

    if (isLoading && !profile) {
        return (
            <PageShell className="flex items-center justify-center">
                <p className="text-gray-500">Loading profile...</p>
            </PageShell>
        );
    }

    if (!profile) return null;

    const currentCurrency = currencies.find(c => c.code === settings?.default_currency);

    return (
        <PageShell>
            <header className="flex flex-col items-center pt-4 pb-6">
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
            </header>

            <main className="flex flex-col gap-6">
                {/* Profile Card */}
                <Card className="flex items-center gap-4">
                    <img
                        src={profile.photo_url || `https://ui-avatars.com/api/?name=${profile.display_name || profile.first_name || 'User'}&background=random`}
                        alt={profile.display_name || ""}
                        className="w-16 h-16 rounded-full object-cover shadow-sm"
                    />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'}
                        </h2>
                        <p className="text-sm text-gray-500">@{profile.username || profile.telegram_id}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Member since {new Date(profile.created_at).getFullYear()}
                        </p>
                    </div>
                </Card>

                {/* Settings List */}
                <div className="space-y-2">
                    <SettingsRow
                        icon={Globe}
                        label="Language"
                        value={settings?.language === 'en' ? 'English' : settings?.language || 'English'}
                    />
                    <SettingsRow
                        icon={DollarSign}
                        label="Currency"
                        value={currentCurrency ? `${currentCurrency.code} (${currentCurrency.symbol})` : settings?.default_currency}
                        onClick={() => setIsCurrencyModalOpen(true)}
                    />
                    <SettingsRow icon={Bell} label="Notifications" value="On" />
                    <SettingsRow icon={Settings} label="App Settings" />
                </div>

                <Button
                    variant="danger"
                    fullWidth
                    onClick={handleLogout}
                    className="mt-4"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                </Button>
            </main>

            {/* Currency Selection Modal */}
            <Modal
                isOpen={isCurrencyModalOpen}
                onClose={() => setIsCurrencyModalOpen(false)}
                title="Select Currency"
            >
                <div className="space-y-1 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {currencies.map((currency) => (
                        <button
                            type="button"
                            key={currency.code}
                            onClick={() => handleCurrencySelect(currency.code)}
                            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-gray-900">{currency.code}</span>
                                <span className="text-xs text-gray-500">{currency.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-medium text-gray-400">{currency.symbol}</span>
                                {settings?.default_currency === currency.code && (
                                    <Check className="w-5 h-5 text-blue-500" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>
        </PageShell>
    );
}

function SettingsRow({
    icon: Icon,
    label,
    value,
    onClick
}: {
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value?: string,
    onClick?: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-gray-500">{value}</span>}
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        </button>
    );
}

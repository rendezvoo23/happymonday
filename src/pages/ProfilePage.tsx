import { DollarSignIcon, GlobeIcon, MoonIcon } from "@/components/icons";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useTheme } from "@/context/ThemeContext";
import { useUserStore } from "@/stores/userStore";
import { Check, ChevronLeft, ChevronRight, Monitor, Sun } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, settings, currencies, updateSettings, isLoading } =
    useUserStore();
  const { theme, setTheme } = useTheme();
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Data loading is handled globally in App.tsx
  useEffect(() => {
    // We can still trigger re-loads if needed, but App.tsx ensures initial data is there.
  }, []);

  const handleCurrencySelect = async (code: string) => {
    await updateSettings({ default_currency: code });
    setIsCurrencyModalOpen(false);
  };

  const handleThemeSelect = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    setIsThemeModalOpen(false);
  };

  const getThemeLabel = (themeValue: string) => {
    switch (themeValue) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "System";
    }
  };

  if (isLoading && !profile) {
    return (
      <PageShell className="flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
      </PageShell>
    );
  }

  if (!profile) return null;

  const currentCurrency = currencies.find(
    (c) => c.code === settings?.default_currency
  );

  return (
    <PageShell>
      <header className="relative flex flex-col items-center pt-4 pb-6">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="absolute left-4 top-4 p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Profile
        </h1>
      </header>

      <main className="flex flex-col gap-6">
        <Card className="flex flex-col items-center gap-2 py-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {profile.display_name ||
              `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
              "User"}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Member since {new Date(profile.created_at).getFullYear()}
          </p>
        </Card>

        {/* Settings List */}
        <div className="space-y-2">
          <SettingsRow
            icon={GlobeIcon}
            label="Language"
            value={
              settings?.language === "en"
                ? "English"
                : settings?.language || "English"
            }
          />
          <SettingsRow
            icon={DollarSignIcon}
            label="Currency"
            value={
              currentCurrency
                ? `${currentCurrency.code} (${currentCurrency.symbol})`
                : settings?.default_currency
            }
            onClick={() => setIsCurrencyModalOpen(true)}
          />
          <SettingsRow
            icon={MoonIcon}
            label="Theme"
            value={getThemeLabel(theme)}
            onClick={() => setIsThemeModalOpen(true)}
          />
        </div>
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
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currency.code}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currency.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium text-gray-400 dark:text-gray-500">
                  {currency.symbol}
                </span>
                {settings?.default_currency === currency.code && (
                  <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title="Select Theme"
      >
        <div className="space-y-1">
          {[
            {
              value: "light" as const,
              label: "Light",
              icon: Sun,
              description: "Always use light mode",
            },
            {
              value: "dark" as const,
              label: "Dark",
              icon: MoonIcon,
              description: "Always use dark mode",
            },
            {
              value: "system" as const,
              label: "System",
              icon: Monitor,
              description: "Match device settings",
            },
          ].map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                type="button"
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {themeOption.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {themeOption.description}
                    </span>
                  </div>
                </div>
                {theme === themeOption.value && (
                  <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </PageShell>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm text-gray-600 dark:text-gray-300">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {value}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
    </button>
  );
}

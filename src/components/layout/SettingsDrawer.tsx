import { DollarSignIcon, GlobeIcon, MoonIcon } from "@/components/icons";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserStore } from "@/stores/userStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Send,
  Sun,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Drawer } from "vaul";

type SettingsScreen = "main" | "language" | "currency" | "theme" | "telegram";

const CLOSE_ON_SELECT = true;

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { settings, currencies, updateSettings, isLoading } = useUserStore();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, languages } = useLocale();
  const [currentScreen, setCurrentScreen] = useState<SettingsScreen>("main");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const navigateToScreen = (screen: SettingsScreen) => {
    setDirection("forward");
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    setDirection("backward");
    setCurrentScreen("main");
  };

  const handleCurrencySelect = async (code: string) => {
    await updateSettings({ default_currency: code });
    if (CLOSE_ON_SELECT) {
      onClose();
      setTimeout(() => setCurrentScreen("main"), 300);
    } else {
      navigateBack();
    }
  };

  const handleThemeSelect = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    if (CLOSE_ON_SELECT) {
      onClose();
      setTimeout(() => setCurrentScreen("main"), 300);
    } else {
      navigateBack();
    }
  };

  const getThemeLabel = (themeValue: string) => {
    switch (themeValue) {
      case "light":
        return t("theme.light");
      case "dark":
        return t("theme.dark");
      case "system":
        return t("theme.system");
      default:
        return t("theme.system");
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setLocale(languageCode as typeof locale);
    if (CLOSE_ON_SELECT) {
      onClose();
      setTimeout(() => setCurrentScreen("main"), 300);
    } else {
      navigateBack();
    }
  };

  const handleDrawerClose = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset to main screen after drawer closes
      setTimeout(() => setCurrentScreen("main"), 300);
    }
  };

  const currentLanguage = languages.find((l) => l.code === locale);
  const currentCurrency = currencies.find(
    (c) => c.code === settings?.default_currency
  );

  const slideVariants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "100%" : "-20%",
      opacity: direction === "forward" ? 1 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "-20%" : "100%",
      opacity: direction === "forward" ? 0 : 1,
    }),
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleDrawerClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-white dark:bg-gray-900 flex flex-col rounded-t-[24px] h-[500px] mt-24 fixed bottom-0 left-0 right-0 z-50 outline-none overflow-hidden">
          {/* Handle */}
          <div className="flex-shrink-0 mx-auto w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mt-4 mb-6" />

          {/* Header */}
          <div className="flex-shrink-0 px-6 pb-4 relative">
            {currentScreen !== "main" && (
              <button
                type="button"
                onClick={navigateBack}
                className="absolute left-4 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <Drawer.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              {currentScreen === "main" && t("settings.title")}
              {currentScreen === "language" && t("settings.selectLanguage")}
              {currentScreen === "currency" && t("settings.selectCurrency")}
              {currentScreen === "theme" && t("settings.selectTheme")}
              {currentScreen === "telegram" && "Telegram"}
            </Drawer.Title>
          </div>

          {/* Content with slide animation */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.div
                key={currentScreen}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0 overflow-y-auto px-6 pb-8"
              >
                {currentScreen === "main" && (
                  <MainScreen
                    isLoading={isLoading}
                    settings={settings}
                    currentLanguage={currentLanguage}
                    currentCurrency={currentCurrency}
                    theme={theme}
                    getThemeLabel={getThemeLabel}
                    navigateToScreen={navigateToScreen}
                    t={t}
                  />
                )}

                {currentScreen === "language" && (
                  <LanguageScreen
                    languages={languages}
                    locale={locale}
                    onSelect={handleLanguageSelect}
                  />
                )}

                {currentScreen === "currency" && (
                  <CurrencyScreen
                    currencies={currencies}
                    selectedCurrency={settings?.default_currency}
                    onSelect={handleCurrencySelect}
                  />
                )}

                {currentScreen === "theme" && (
                  <ThemeScreen
                    theme={theme}
                    onSelect={handleThemeSelect}
                    t={t}
                  />
                )}

                {currentScreen === "telegram" && (
                  <TelegramScreen onClose={onClose} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Main Settings Screen
function MainScreen({
  isLoading,
  settings,
  currentLanguage,
  currentCurrency,
  theme,
  getThemeLabel,
  navigateToScreen,
  t,
}: {
  isLoading: boolean;
  settings: { default_currency?: string } | null;
  currentLanguage:
    | { code: string; name: string; nativeName: string }
    | undefined;
  currentCurrency: { code: string; name: string; symbol: string } | undefined;
  theme: string;
  getThemeLabel: (theme: string) => string;
  navigateToScreen: (screen: SettingsScreen) => void;
  t: (key: string) => string;
}) {
  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">
          {t("settings.loadingSettings")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Settings List */}
      <div className="space-y-2">
        <SettingsRow
          icon={GlobeIcon}
          label={t("settings.language")}
          value={currentLanguage?.nativeName || "English"}
          onClick={() => navigateToScreen("language")}
        />
        <SettingsRow
          icon={DollarSignIcon}
          label={t("settings.currency")}
          value={
            currentCurrency
              ? `${currentCurrency.code} (${currentCurrency.symbol})`
              : settings?.default_currency
          }
          onClick={() => navigateToScreen("currency")}
        />
        <SettingsRow
          icon={MoonIcon}
          label={t("settings.theme")}
          value={getThemeLabel(theme)}
          onClick={() => navigateToScreen("theme")}
        />
        <SettingsRow
          icon={Send}
          label="Telegram"
          value=""
          onClick={() => navigateToScreen("telegram")}
        />
      </div>
    </div>
  );
}

// Language Selection Screen
function LanguageScreen({
  languages,
  locale,
  onSelect,
}: {
  languages: Array<{ code: string; name: string; nativeName: string }>;
  locale: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="space-y-1">
      {languages.map((language) => (
        <button
          type="button"
          key={language.code}
          onClick={() => onSelect(language.code)}
          className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex flex-col items-start">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {language.nativeName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {language.name}
            </span>
          </div>
          {locale === language.code && (
            <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          )}
        </button>
      ))}
    </div>
  );
}

// Currency Selection Screen
function CurrencyScreen({
  currencies,
  selectedCurrency,
  onSelect,
}: {
  currencies: Array<{ code: string; name: string; symbol: string }>;
  selectedCurrency?: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="space-y-1">
      {currencies.map((currency) => (
        <button
          type="button"
          key={currency.code}
          onClick={() => onSelect(currency.code)}
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
            {selectedCurrency === currency.code && (
              <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// Theme Selection Screen
function ThemeScreen({
  theme,
  onSelect,
  t,
}: {
  theme: string;
  onSelect: (theme: "light" | "dark" | "system") => void;
  t: (key: string) => string;
}) {
  const themes = [
    {
      value: "light" as const,
      label: t("theme.light"),
      icon: Sun,
      description: t("theme.lightDescription"),
    },
    {
      value: "dark" as const,
      label: t("theme.dark"),
      icon: MoonIcon,
      description: t("theme.darkDescription"),
    },
    {
      value: "system" as const,
      label: t("theme.system"),
      icon: Monitor,
      description: t("theme.systemDescription"),
    },
  ];

  return (
    <div className="space-y-1">
      {themes.map((themeOption) => {
        const Icon = themeOption.icon;
        return (
          <button
            type="button"
            key={themeOption.value}
            onClick={() => onSelect(themeOption.value)}
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
  );
}

// Telegram Settings Screen
function TelegramScreen({ onClose }: { onClose: () => void }) {
  const handleOpenTelegramSettings = () => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink("https://t.me/settings");
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink("https://t.me/settings");
    }
    onClose();
  };

  const handleOpenSupport = () => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink("https://t.me/telegram");
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink("https://t.me/telegram");
    }
    onClose();
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleOpenTelegramSettings}
        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Open Telegram Settings
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Manage your Telegram account settings
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </button>

      <button
        type="button"
        onClick={handleOpenSupport}
        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Telegram Support
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Get help with Telegram
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </button>

      {window.Telegram?.WebApp?.version && (
        <div className="p-4 mt-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium">Telegram WebApp Version:</span>{" "}
              {window.Telegram.WebApp.version}
            </p>
            <p>
              <span className="font-medium">Platform:</span>{" "}
              {window.Telegram.WebApp.platform || "Unknown"}
            </p>
          </div>
        </div>
      )}
    </div>
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

import { DollarSignIcon, GlobeIcon } from "@/components/icons";
import { Header } from "@/components/layout/Header";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserStore } from "@/stores/userStore";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, HeartIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_authenticated/settings/main")({
  component: MainSettingsPage,
});

function MainSettingsPage() {
  const { settings, currencies, isLoading } = useUserStore();
  const { theme, actualTheme, setTheme } = useTheme();
  const { locale, t, languages } = useLocale();
  const navigate = useNavigate();
  const switchInputRef = useRef<HTMLInputElement>(null);

  const currentLanguage = languages.find((l) => l.code === locale);
  const currentCurrency = currencies.find(
    (c) => c.code === settings?.default_currency
  );

  const isAutomatic = theme === "system";

  // Set switch attribute on the input element
  useEffect(() => {
    if (switchInputRef.current) {
      switchInputRef.current.setAttribute("switch", "");
    }
  }, []);

  const handleAutomaticToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setTheme("system");
    } else {
      // When turning off automatic, keep the current displayed theme
      setTheme(actualTheme);
    }
  };

  const handleThemeVariantSelect = (variant: "light" | "dark") => {
    // Always set to manual mode when selecting a theme
    setTheme(variant);
  };

  if (isLoading && !settings) {
    return (
      <>
        <Header>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.title")}
          </div>
        </Header>
        <div className="flex items-center justify-center h-full px-6">
          <p className="text-gray-500 dark:text-gray-400">
            {t("settings.loadingSettings")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header>
        <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("settings.title")}
        </div>
      </Header>
      <div className="px-6 pb-8 space-y-4">
        <div className="bg-white dark:bg-[var(--bacground-level-1)] rounded-[24px] p-6">
          {/* Phone Previews */}
          <div className="flex justify-center gap-8 mb-4">
            <ThemePreview
              theme="light"
              label={t("theme.light")}
              selected={actualTheme === "light"}
              onClick={() => handleThemeVariantSelect("light")}
            />
            <ThemePreview
              theme="dark"
              label={t("theme.dark")}
              selected={actualTheme === "dark"}
              onClick={() => handleThemeVariantSelect("dark")}
            />
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-6" />

          {/* Automatic Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-normal text-gray-900 dark:text-gray-100">
              {t("theme.automatic") || "Automatic"}
            </span>

            <input
              ref={switchInputRef}
              type="checkbox"
              checked={isAutomatic}
              onChange={handleAutomaticToggle}
            />
          </div>
        </div>

        {/* Settings Group */}
        <div className="settings-group">
          <SettingsRow
            icon={GlobeIcon}
            iconColor="bg-blue-500"
            label={t("settings.language")}
            value={currentLanguage?.nativeName || "English"}
            onClick={() => navigate({ to: "/settings/language" })}
            position="first"
          />
          <SettingsRow
            icon={DollarSignIcon}
            iconColor="bg-green-500"
            label={t("settings.currency")}
            value={
              currentCurrency
                ? `${currentCurrency.code} (${currentCurrency.symbol})`
                : settings?.default_currency
            }
            onClick={() => navigate({ to: "/settings/currency" })}
            position="middle"
          />
          <SettingsRow
            icon={HeartIcon}
            iconColor="bg-pink-500"
            label={t("settings.donate")}
            value={<span className="text-yellow-500">⭐</span>}
            onClick={() => navigate({ to: "/settings/donate" })}
            position="last"
          />
        </div>
      </div>
    </>
  );
}

function ThemePreview({
  theme,
  label,
  selected,
  onClick,
}: {
  theme: "light" | "dark";
  label: React.ReactNode;
  selected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-4"
    >
      {/* Phone Preview */}
      <div className="relative w-24 h-24 rounded-full overflow-hidden">
        {/* Phone Screen with gradient background */}
        <div
          className={`w-full h-full flex flex-col items-center justify-center ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200"
              : "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900"
          }`}
        >
          {/* Mock UI Elements */}
          <div className="absolute bottom-32 left-8 right-8 space-y-3">
            <div
              className={`h-16 rounded-2xl ${
                theme === "light"
                  ? "bg-white/40 backdrop-blur-sm"
                  : "bg-white/10 backdrop-blur-sm"
              }`}
            />
            <div
              className={`h-16 rounded-2xl ${
                theme === "light"
                  ? "bg-white/40 backdrop-blur-sm"
                  : "bg-white/10 backdrop-blur-sm"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Theme Label */}
      <span className="text-xl font-normal text-gray-900 dark:text-gray-100">
        {label}
      </span>

      {/* Circular Checkbox */}
      <div
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? "bg-blue-500 border-blue-500"
            : "border-gray-400 dark:border-gray-600"
        }`}
      >
        {selected && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-label="Selected"
          >
            <title>Selected</title>
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

function SettingsRow({
  icon: Icon,
  iconColor,
  label,
  value,
  onClick,
  position = "single",
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  position?: "first" | "middle" | "last" | "single";
}) {
  const getRoundedClass = () => {
    switch (position) {
      case "first":
        return "rounded-t-xl rounded-b-none";
      case "last":
        return "rounded-b-xl rounded-t-none";
      case "middle":
        return "rounded-none";
      case "single":
        return "rounded-xl";
      default:
        return "rounded-xl";
    }
  };

  const showDivider = position === "first" || position === "middle";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[var(--bacground-level-1)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${getRoundedClass()}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 ${iconColor || "bg-gray-500"} rounded-lg text-white flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-[17px] text-gray-900 dark:text-gray-100">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-[17px] text-gray-500 dark:text-gray-400">
            {value}
          </span>
        )}
        <ChevronRight
          className="w-5 h-5 text-gray-300 dark:text-gray-700"
          strokeWidth={2.5}
        />
      </div>
      {showDivider && (
        <div className="absolute bottom-0 left-14 right-0 h-px bg-gray-200 dark:bg-gray-700" />
      )}
    </button>
  );
}

import { DollarSignIcon, GlobeIcon, MoonIcon } from "@/components/icons";
import { Header } from "@/components/layout/Header";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserStore } from "@/stores/userStore";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, HeartIcon } from "lucide-react";
import type * as React from "react";

export const Route = createFileRoute("/_authenticated/settings/main")({
  component: MainSettingsPage,
});

function MainSettingsPage() {
  const { settings, currencies, isLoading } = useUserStore();
  const { theme } = useTheme();
  const { locale, t, languages } = useLocale();
  const navigate = useNavigate();

  const currentLanguage = languages.find((l) => l.code === locale);
  const currentCurrency = currencies.find(
    (c) => c.code === settings?.default_currency
  );

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
      <div className="px-6 pb-8">
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
            icon={MoonIcon}
            iconColor="bg-indigo-500"
            label={t("settings.theme")}
            value={getThemeLabel(theme)}
            onClick={() => navigate({ to: "/settings/theme" })}
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
      className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800/90 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${getRoundedClass()}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 ${iconColor || "bg-gray-500"} rounded-lg text-white flex items-center justify-center`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <span className="font-normal text-[17px] text-gray-900 dark:text-gray-100">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-[17px] text-gray-500 dark:text-gray-400">
            {value}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
      {showDivider && (
        <div className="absolute bottom-0 left-14 right-0 h-px bg-gray-200 dark:bg-gray-700" />
      )}
    </button>
  );
}

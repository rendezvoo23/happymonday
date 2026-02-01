import { MoonIcon } from "@/components/icons";
import { Header } from "@/components/layout/Header";
import { LiquidButton } from "@/components/ui/button/button";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Monitor, Sun } from "lucide-react";
import type * as React from "react";

export const Route = createFileRoute("/_authenticated/settings/theme")({
  component: ThemeSettingsPage,
});

function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  useTelegramBackButton();

  const handleThemeSelect = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    navigate({ to: "/settings/main" });
  };

  const themes = [
    {
      value: "light" as const,
      label: t("theme.light"),
      icon: Sun,
      iconColor: "bg-orange-500",
      description: t("theme.lightDescription"),
    },
    {
      value: "dark" as const,
      label: t("theme.dark"),
      icon: MoonIcon,
      iconColor: "bg-indigo-500",
      description: t("theme.darkDescription"),
    },
    {
      value: "system" as const,
      label: t("theme.system"),
      icon: Monitor,
      iconColor: "bg-gray-500",
      description: t("theme.systemDescription"),
    },
  ];

  return (
    <>
      <Header>
        <div className="flex items-center justify-center w-full relative px-6">
          <LiquidButton
            type="button"
            variant="liquid"
            size="icon-lg"
            onClick={() => navigate({ to: "/settings/main" })}
            className="absolute left-4"
          >
            <ChevronLeft className="w-5 h-5" />
          </LiquidButton>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.selectTheme")}
          </div>
        </div>
      </Header>
      <div className="px-6 pb-8">
        <div className="settings-group">
          {themes.map((themeOption, index) => {
            const Icon = themeOption.icon;
            return (
              <ModalListItem
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                position={
                  index === 0
                    ? "first"
                    : index === themes.length - 1
                      ? "last"
                      : "middle"
                }
                isSelected={theme === themeOption.value}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={`p-1.5 ${themeOption.iconColor} rounded-lg text-white flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-normal text-[17px] text-gray-900 dark:text-gray-100">
                      {themeOption.label}
                    </span>
                    <span className="text-[13px] text-gray-500 dark:text-gray-400">
                      {themeOption.description}
                    </span>
                  </div>
                </div>
              </ModalListItem>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ModalListItem({
  children,
  onClick,
  position = "single",
  isSelected = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  position?: "first" | "middle" | "last" | "single";
  isSelected?: boolean;
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
      {children}
      {isSelected && (
        <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 ml-2" />
      )}
      {showDivider && (
        <div className="absolute bottom-0 left-4 right-0 h-px bg-gray-200 dark:bg-gray-700" />
      )}
    </button>
  );
}

import { DollarSignIcon, GlobeIcon, MoonIcon } from "@/components/icons";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { env } from "@/env";
import { useUserStore } from "@/stores/userStore";
import {
  Check,
  ChevronRight,
  Code2,
  Monitor,
  Palette,
  Search,
  Sun,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, currencies, updateSettings, isLoading } = useUserStore();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, languages } = useLocale();
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState("");

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
    setIsLanguageModalOpen(false);
  };

  const currentLanguage = languages.find((l) => l.code === locale);

  if (isLoading && !settings) {
    return (
      <PageShell className="flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          {t("settings.loadingSettings")}
        </p>
      </PageShell>
    );
  }

  const currentCurrency = currencies.find(
    (c) => c.code === settings?.default_currency
  );

  return (
    <PageShell>
      <header className="relative flex flex-col items-center pt-4 pb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("settings.title")}
        </h1>
      </header>

      <main className="flex flex-col gap-6 px-4">
        {/* Settings Group */}
        <div className="settings-group">
          <SettingsRow
            icon={GlobeIcon}
            iconColor="bg-blue-500"
            label={t("settings.language")}
            value={currentLanguage?.nativeName || "English"}
            onClick={() => setIsLanguageModalOpen(true)}
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
            onClick={() => setIsCurrencyModalOpen(true)}
            position="middle"
          />
          <SettingsRow
            icon={MoonIcon}
            iconColor="bg-indigo-500"
            label={t("settings.theme")}
            value={getThemeLabel(theme)}
            onClick={() => setIsThemeModalOpen(true)}
            position="last"
          />
        </div>

        {/* Developer Examples Section - only visible in dev mode */}
        {env.isDev && (
          <div className="settings-group">
            <SettingsRow
              icon={Code2}
              iconColor="bg-purple-500"
              label="Localization Example"
              value="i18n Demo"
              onClick={() => navigate("/examples/localization")}
              position="first"
            />
            <SettingsRow
              icon={Palette}
              iconColor="bg-pink-500"
              label="Theme System Example"
              value="Card Levels"
              onClick={() => navigate("/examples/theme")}
              position="last"
            />
          </div>
        )}
      </main>

      {/* Language Selection Modal */}
      <Modal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        title={t("settings.selectLanguage")}
      >
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="settings-group">
            {languages.map((language, index) => (
              <ModalItem
                key={language.code}
                onClick={() => handleLanguageSelect(language.code)}
                position={
                  index === 0
                    ? "first"
                    : index === languages.length - 1
                      ? "last"
                      : "middle"
                }
                isSelected={locale === language.code}
              >
                <div className="flex flex-col items-start">
                  <span className="font-normal text-[17px] text-gray-900 dark:text-gray-100">
                    {language.nativeName}
                  </span>
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                    {language.name}
                  </span>
                </div>
              </ModalItem>
            ))}
          </div>
        </div>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => {
          setIsCurrencyModalOpen(false);
          setCurrencySearchQuery("");
        }}
        title={t("settings.selectCurrency")}
      >
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={currencySearchQuery}
              onChange={(e) => setCurrencySearchQuery(e.target.value)}
              placeholder="Search currencies..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Currency List */}
          <div className="min-h-[50vh] max-h-[50vh] overflow-y-auto no-scrollbar">
            <div className="settings-group">
              {currencies
                .filter((currency) => {
                  const query = currencySearchQuery.toLowerCase();
                  return (
                    currency.code.toLowerCase().includes(query) ||
                    currency.name.toLowerCase().includes(query)
                  );
                })
                .map((currency, index, filteredCurrencies) => (
                  <ModalItem
                    key={currency.code}
                    onClick={() => handleCurrencySelect(currency.code)}
                    position={
                      index === 0
                        ? "first"
                        : index === filteredCurrencies.length - 1
                          ? "last"
                          : "middle"
                    }
                    isSelected={settings?.default_currency === currency.code}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start">
                        <span className="font-normal text-[17px] text-gray-900 dark:text-gray-100">
                          {currency.code}
                        </span>
                        <span className="text-[13px] text-gray-500 dark:text-gray-400">
                          {currency.name}
                        </span>
                      </div>
                      <span className="text-[17px] font-normal text-gray-400 dark:text-gray-500 mr-2">
                        {currency.symbol}
                      </span>
                    </div>
                  </ModalItem>
                ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title={t("settings.selectTheme")}
      >
        <div className="settings-group">
          {[
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
          ].map((themeOption, index, array) => {
            const Icon = themeOption.icon;
            return (
              <ModalItem
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                position={
                  index === 0
                    ? "first"
                    : index === array.length - 1
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
              </ModalItem>
            );
          })}
        </div>
      </Modal>
    </PageShell>
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
  label: string;
  value?: string;
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
      className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[var(--background-level-1)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${getRoundedClass()}`}
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

function ModalItem({
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
      className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[var(--background-level-1)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${getRoundedClass()}`}
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

import { DollarSignIcon, GlobeIcon, MoonIcon } from "@/components/icons";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { env } from "@/env";
import { useUserStore } from "@/stores/userStore";
import { Check, Code2, Monitor, Palette, Search, Sun } from "lucide-react";
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

      <main className="flex flex-col gap-6">
        <div className="space-y-2">
          <SettingsRow
            icon={GlobeIcon}
            label={t("settings.language")}
            value={currentLanguage?.nativeName || "English"}
            onClick={() => setIsLanguageModalOpen(true)}
          />
          <SettingsRow
            icon={DollarSignIcon}
            label={t("settings.currency")}
            value={
              currentCurrency
                ? `${currentCurrency.code} (${currentCurrency.symbol})`
                : settings?.default_currency
            }
            onClick={() => setIsCurrencyModalOpen(true)}
          />
          <SettingsRow
            icon={MoonIcon}
            label={t("settings.theme")}
            value={getThemeLabel(theme)}
            onClick={() => setIsThemeModalOpen(true)}
          />
        </div>

        {env.isDev && (
          <div className="space-y-2">
            <SettingsRow
              icon={Code2}
              label="Localization Example"
              value="i18n Demo"
              onClick={() => navigate("/examples/localization")}
            />
            <SettingsRow
              icon={Palette}
              label="Theme System Example"
              value="Card Levels"
              onClick={() => navigate("/examples/theme")}
            />
          </div>
        )}
      </main>

      <Modal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        title={t("settings.selectLanguage")}
      >
        <div className="space-y-1 max-h-[60vh] overflow-y-auto no-scrollbar">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageSelect(language.code)}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-2"
            >
              <div className="flex flex-col items-start text-left">
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
      </Modal>

      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => {
          setIsCurrencyModalOpen(false);
          setCurrencySearchQuery("");
        }}
        title={t("settings.selectCurrency")}
      >
        <div className="space-y-3">
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

          <div className="space-y-1 min-h-[50vh] max-h-[50vh] overflow-y-auto no-scrollbar">
            {currencies
              .filter((currency) => {
                const query = currencySearchQuery.toLowerCase();
                return (
                  currency.code.toLowerCase().includes(query) ||
                  currency.name.toLowerCase().includes(query)
                );
              })
              .map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleCurrencySelect(currency.code)}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-2"
                >
                  <div className="flex flex-col items-start text-left">
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
        </div>
      </Modal>

      <Modal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title={t("settings.selectTheme")}
      >
        <div className="space-y-1">
          {[
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
          ].map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                type="button"
                onClick={() => handleThemeSelect(themeOption.value)}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-2 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg text-gray-700 dark:text-gray-300">
                    <Icon className="w-5 h-5" />
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

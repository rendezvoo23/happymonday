import { DollarSignIcon, GlobeIcon } from "@/components/icons";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Language } from "@/locales";
import { useUserStore } from "@/stores/userStore";
import {
  Check,
  ChevronLeft,
  HeartIcon,
  Monitor,
  Moon as MoonIcon,
  Search,
  Star,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "../ui/Button";
import { SettingsRow } from "../ui/SettingsRow";

interface MainScreenProps {
  navigateToScreen: (screen: SettingsScreen) => void;
  currentLanguage?: { nativeName: string };
  currentCurrency?: { code: string; symbol: string };
  getThemeLabel: (theme: string) => string;
  theme: string;
  settings: any; // UserSettings type from store can be complex, keeping as is for now but without lint warning if possible
  t: (key: string) => string;
  onClose: () => void;
}

interface LanguageScreenProps {
  languages: { code: string; name: string; nativeName: string }[];
  locale: Language;
  onSelect: (code: string) => void;
}

interface CurrencyScreenProps {
  currencies: { code: string; name: string; symbol: string }[];
  selectedCurrency: string;
  onSelect: (code: string) => void;
}

interface ThemeScreenProps {
  theme: string;
  onSelect: (mode: "light" | "dark" | "system") => void;
  t: (key: string) => string;
}

interface DonateScreenProps {
  onClose: () => void;
  t: (key: string) => string;
}

type SettingsScreen = "main" | "language" | "currency" | "theme" | "donate";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BASE_DONATE_URL = "https://t.me/whyspent_bot?start=donate";

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [currentScreen, setCurrentScreen] = useState<SettingsScreen>("main");
  const { settings, currencies, updateSettings } = useUserStore();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, languages } = useLocale();

  // Reset to main screen when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCurrentScreen("main"), 300);
    }
  }, [isOpen]);

  const navigateBack = () => setCurrentScreen("main");
  const navigateToScreen = (screen: SettingsScreen) => setCurrentScreen(screen);

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

  return (
    <Drawer.Root open={isOpen} onClose={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col rounded-t-[32px] h-[65vh] fixed bottom-0 left-0 right-0 z-50 outline-none shadow-2xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 mt-3 mb-4" />

          <div className="p-4 pt-0 h-full flex flex-col">
            <div className="relative flex items-center justify-center mb-6">
              {currentScreen !== "main" && (
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={navigateBack}
                  className="absolute left-0 top-[-6px]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <Drawer.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
                {currentScreen === "main" && t("settings.title")}
                {currentScreen === "language" && t("settings.selectLanguage")}
                {currentScreen === "currency" && t("settings.selectCurrency")}
                {currentScreen === "theme" && t("settings.selectTheme")}
                {currentScreen === "donate" && "Support Us"}
              </Drawer.Title>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
              {currentScreen === "main" && (
                <MainScreen
                  onClose={onClose}
                  navigateToScreen={navigateToScreen}
                  currentLanguage={currentLanguage}
                  currentCurrency={currentCurrency}
                  getThemeLabel={getThemeLabel}
                  theme={theme}
                  settings={settings}
                  t={t}
                />
              )}
              {currentScreen === "language" && (
                <LanguageScreen
                  languages={languages}
                  locale={locale}
                  onSelect={(code) => {
                    setLocale(code as Language);
                    navigateBack();
                  }}
                />
              )}
              {currentScreen === "currency" && (
                <CurrencyScreen
                  currencies={currencies}
                  selectedCurrency={settings?.default_currency || ""}
                  onSelect={(code) => {
                    updateSettings({ default_currency: code });
                    navigateBack();
                  }}
                />
              )}
              {currentScreen === "theme" && (
                <ThemeScreen
                  theme={theme}
                  onSelect={(mode) => {
                    setTheme(mode);
                    navigateBack();
                  }}
                  t={t}
                />
              )}
              {currentScreen === "donate" && <DonateScreen onClose={onClose} />}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function MainScreen({
  navigateToScreen,
  currentLanguage,
  currentCurrency,
  getThemeLabel,
  theme,
  settings,
  t,
}: MainScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
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
          icon={HeartIcon}
          label={t("settings.donate")}
          value={<span className="text-yellow-500">⭐</span>}
          onClick={() => navigateToScreen("donate")}
        />
      </div>

      <div className="mt-4 pt-6 border-t border-gray-200 dark:border-gray-800 text-center space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Happy Monday v1.2
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          STUDENT BUILT &bull; PRIVACY FIRST
        </p>
      </div>
    </div>
  );
}

function LanguageScreen({ languages, locale, onSelect }: LanguageScreenProps) {
  return (
    <div className="space-y-1">
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => onSelect(language.code)}
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
  );
}

function CurrencyScreen({
  currencies,
  selectedCurrency,
  onSelect,
}: CurrencyScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCurrencies = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    );
  }, [currencies, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search currencies..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-1">
        {filteredCurrencies.length > 0 ? (
          filteredCurrencies.map((currency) => (
            <button
              key={currency.code}
              type="button"
              onClick={() => onSelect(currency.code)}
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
                {selectedCurrency === currency.code && (
                  <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeScreen({ theme, onSelect, t }: ThemeScreenProps) {
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
            key={themeOption.value}
            type="button"
            onClick={() => onSelect(themeOption.value)}
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
  );
}

function DonateScreen({ onClose }: Omit<DonateScreenProps, "t">) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const donateAmounts = [
    { stars: 50, label: "Coffee" },
    { stars: 250, label: "Pizza" },
    { stars: 500, label: "Dinner" },
    { stars: 1000, label: "Legendary" },
  ];

  const handleDonate = async (amount: number) => {
    setIsProcessing(true);
    try {
      if (window.Telegram?.WebApp?.openInvoice) {
        let invoiceUrl = "";
        try {
          const { data, error } = await supabase.functions.invoke(
            "create-stars-invoice",
            {
              body: {
                amount: amount,
                title: `Donate ${amount} Stars`,
                payload: `donate_${amount}_${Date.now()}`,
              },
            }
          );
          if (error) throw error;
          invoiceUrl = data.result;
        } catch (invoiceError) {
          invoiceUrl = `mock://telegram/invoice/${amount}`;
        }

        window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
          if (status === "paid") {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred(
                "success"
              );
            }
            setTimeout(() => onClose(), 500);
          }
          setIsProcessing(false);
        });
      } else {
        const fallbackUrl = `${BASE_DONATE_URL}_${amount}`;
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(fallbackUrl);
        } else {
          window.open(fallbackUrl, "_blank");
        }
        setIsProcessing(false);
        onClose();
      }
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
    }
  };

  const handleCustomDonate = () => {
    const amount = Number.parseInt(customAmount, 10);
    if (!Number.isNaN(amount) && amount > 0) {
      handleDonate(amount);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">⭐</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Support our development with Telegram Stars
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {donateAmounts.map((item) => (
          <Button
            key={item.stars}
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
              }
              setSelectedAmount(item.stars);
              setCustomAmount("");
              handleDonate(item.stars);
            }}
            disabled={isProcessing}
            variant={selectedAmount === item.stars ? "primary" : "secondary"}
            className="h-auto py-4"
          >
            <div className="flex flex-col items-center gap-2">
              <Star
                className={cn(
                  "w-6 h-6",
                  selectedAmount === item.stars
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-gray-400"
                )}
              />
              <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {item.stars}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
            </div>
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="custom-donate-amount"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Custom Amount
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
            <input
              id="custom-donate-amount"
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              placeholder="Enter amount"
              min="1"
              disabled={isProcessing}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-yellow-400 focus:outline-none disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            onClick={handleCustomDonate}
            disabled={
              isProcessing ||
              !customAmount ||
              Number.parseInt(customAmount) <= 0
            }
            className="flex-shrink-0"
          >
            {isProcessing ? "..." : "Send"}
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Payments are processed securely through Telegram Stars</p>
      </div>
    </div>
  );
}

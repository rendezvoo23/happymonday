import { Header } from "@/components/layout/Header";
import { ModalListItem } from "@/components/lists/modal-list-item";
import { LiquidButton } from "@/components/ui/button/button";
import { useLocale } from "@/context/LocaleContext";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useUserStore } from "@/stores/userStore";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/settings/currency")({
  component: CurrencySettingsPage,
});

function CurrencySettingsPage() {
  const { settings, currencies, updateSettings } = useUserStore();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTelegramBackButton();

  const filteredCurrencies = currencies.filter((currency) => {
    const query = searchQuery.toLowerCase();
    return (
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query)
    );
  });

  const handleCurrencySelect = async (code: string) => {
    await updateSettings({ default_currency: code });
    navigate({ to: "/settings/main" });
  };

  const handleSearchClick = () => {
    setIsSearching(true);
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery("");
  };

  const handleSearchAnimationComplete = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Add/remove class to hide bottom nav when searching
  useEffect(() => {
    const bottomNav = document.querySelector(".fixed.bottom-8") as HTMLElement;
    if (bottomNav) {
      if (isSearching) {
        bottomNav.style.display = "none";
      } else {
        bottomNav.style.display = "";
      }
    }

    return () => {
      if (bottomNav) {
        bottomNav.style.display = "";
      }
    };
  }, [isSearching]);

  return (
    <>
      <Header>
        <div className="flex items-center flex-col justify-between w-full relative px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key="header-normal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center w-full relative"
            >
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.selectCurrency")}
              </div>
            </motion.div>

            <motion.div
              key="header-search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onAnimationComplete={handleSearchAnimationComplete}
              className="flex items-center gap-2 w-full mt-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={handleSearchClick}
                  onBlur={handleCloseSearch}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <LiquidButton
                type="button"
                variant="liquid"
                size="icon-lg"
                onClick={handleCloseSearch}
              >
                <X className="w-5 h-5" />
              </LiquidButton>
            </motion.div>
          </AnimatePresence>
        </div>
      </Header>
      <div className="px-6 pb-8">
        {filteredCurrencies.length > 0 ? (
          <div className="settings-group">
            {filteredCurrencies.map((currency, index) => (
              <ModalListItem
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
                    <span className="text-[14px] text-gray-500 dark:text-gray-400">
                      {currency.name}
                    </span>
                  </div>
                  <span className="text-[17px] font-normal text-gray-400 dark:text-gray-500 mr-2">
                    {currency.symbol}
                  </span>
                </div>
              </ModalListItem>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No currencies found
            </p>
          </div>
        )}
      </div>
    </>
  );
}

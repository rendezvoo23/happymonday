import { Header } from "@/components/layout/Header";
import { LiquidButton } from "@/components/ui/button/button";
import { useLocale } from "@/context/LocaleContext";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft } from "lucide-react";
import type * as React from "react";

export const Route = createFileRoute("/_authenticated/settings/language")({
  component: LanguageSettingsPage,
});

function LanguageSettingsPage() {
  const { locale, setLocale, t, languages } = useLocale();
  const navigate = useNavigate();

  const handleLanguageSelect = (languageCode: string) => {
    setLocale(languageCode as typeof locale);
    navigate({ to: "/settings/main" });
  };

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
            {t("settings.selectLanguage")}
          </div>
        </div>
      </Header>
      <div className="px-6 pb-8">
        <div className="settings-group">
          {languages.map((language, index) => (
            <ModalListItem
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
            </ModalListItem>
          ))}
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
      className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800/90 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${getRoundedClass()}`}
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

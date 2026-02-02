import { Header } from "@/components/layout/Header";
import { ModalListItem } from "@/components/lists/modal-list-item";
import { useLocale } from "@/context/LocaleContext";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/language")({
  component: LanguageSettingsPage,
});

function LanguageSettingsPage() {
  const { locale, setLocale, t, languages } = useLocale();
  const navigate = useNavigate();

  useTelegramBackButton();

  const handleLanguageSelect = (languageCode: string) => {
    setLocale(languageCode as typeof locale);
    navigate({ to: "/settings/main" });
  };

  return (
    <>
      <Header>
        <div className="flex items-center justify-center w-full relative px-6 py-1">
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.selectLanguage")}
          </div>
        </div>
      </Header>
      <div className="px-6 pb-24">
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
                <span className="text-[14px] text-gray-500 dark:text-gray-400">
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

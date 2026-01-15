import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type Language, languages } from "@/locales";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";

interface LocaleContextType {
  locale: Language;
  setLocale: (locale: Language) => void;
  t: (key: string) => string;
  languages: typeof languages;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [storedLocale, setStoredLocale] = useLocalStorage<Language>(
    "language",
    "en"
  );

  // Initialize i18n with stored locale
  useEffect(() => {
    if (storedLocale && i18nInstance.language !== storedLocale) {
      i18nInstance.changeLanguage(storedLocale);
    }
  }, [storedLocale, i18nInstance]);

  const setLocale = useCallback(
    (locale: Language) => {
      setStoredLocale(locale);
      i18nInstance.changeLanguage(locale);
    },
    [setStoredLocale, i18nInstance]
  );

  return (
    <LocaleContext.Provider
      value={{
        locale: (i18nInstance.language as Language) || storedLocale,
        setLocale,
        t,
        languages,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

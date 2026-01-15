import { useLocale } from "@/context/LocaleContext";

/**
 * Custom hook for translations
 * This is a wrapper around useLocale().t for easier usage
 */
export function useTranslation() {
  const { t, locale, setLocale, languages } = useLocale();

  return {
    t,
    locale,
    setLocale,
    languages,
  };
}

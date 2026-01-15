import { translations } from "@/locales";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Get browser language or default to English
const getBrowserLanguage = (): string => {
  if (typeof window === "undefined") return "en";

  const browserLang = navigator.language.split("-")[0];
  const supportedLanguages = Object.keys(translations);

  return supportedLanguages.includes(browserLang) ? browserLang : "en";
};

i18n.use(initReactI18next).init({
  resources: Object.entries(translations).reduce(
    (acc, [lang, translation]) => {
      acc[lang] = { translation };
      return acc;
    },
    {} as Record<string, { translation: typeof translations.en }>
  ),
  lng: localStorage.getItem("language") || getBrowserLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

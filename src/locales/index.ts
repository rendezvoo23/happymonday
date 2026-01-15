import ar from "./ar";
import de from "./de";
import en from "./en";
import es from "./es";
import fr from "./fr";
import hi from "./hi";
import it from "./it";
import ja from "./ja";
import ko from "./ko";
import pt from "./pt";
import ru from "./ru";
import zh from "./zh";

export const translations = {
  en,
  es,
  fr,
  de,
  ru,
  zh,
  ja,
  pt,
  it,
  ko,
  ar,
  hi,
};

export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

export type Language = (typeof languages)[number]["code"];
export type TranslationKeys = typeof en;

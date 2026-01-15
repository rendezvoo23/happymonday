import { useDate } from "@/context/DateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ar,
  de,
  enUS,
  es,
  fr,
  hi,
  it,
  ja,
  ko,
  pt,
  ru,
  zhCN,
} from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  className?: string;
}

// Map locale codes to date-fns locales
const dateLocales = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  ru: ru,
  zh: zhCN,
  ja: ja,
  pt: pt,
  it: it,
  ko: ko,
  ar: ar,
  hi: hi,
};

export function MonthSelector({ className }: MonthSelectorProps) {
  const { selectedDate, nextMonth, prevMonth, canGoNext } = useDate();
  const { locale } = useTranslation();

  // Get the date-fns locale based on current language
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] || enUS;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={prevMonth}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <button
        type="button"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center"
      >
        {format(selectedDate, "MMM yyyy", { locale: dateLocale })}
      </button>

      <button
        type="button"
        onClick={nextMonth}
        disabled={!canGoNext}
        className={cn(
          "p-2 rounded-full transition-colors",
          canGoNext
            ? "hover:bg-black/5 cursor-pointer"
            : "opacity-20 cursor-not-allowed"
        )}
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

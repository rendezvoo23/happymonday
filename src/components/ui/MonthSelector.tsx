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
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
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

export function MonthSelector({
  className,
  onPrevMonth,
  onNextMonth,
}: MonthSelectorProps) {
  const { selectedDate, nextMonth, prevMonth, canGoNext } = useDate();
  const { locale } = useTranslation();

  // Get the date-fns locale based on current language
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] || enUS;

  // Use custom handlers if provided, otherwise use default from context
  const handlePrevClick = onPrevMonth || prevMonth;
  const handleNextClick = onNextMonth || nextMonth;

  // Prevent touch events from bubbling up to prevent swipe gesture interference
  const handleTouchEvent = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={handlePrevClick}
        onTouchStart={handleTouchEvent}
        onTouchMove={handleTouchEvent}
        onTouchEnd={handleTouchEvent}
        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors shadow-sm"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      <button
        type="button"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center"
      >
        {format(selectedDate, "MMM yyyy", { locale: dateLocale })}
      </button>

      <button
        type="button"
        onClick={handleNextClick}
        onTouchStart={handleTouchEvent}
        onTouchMove={handleTouchEvent}
        onTouchEnd={handleTouchEvent}
        disabled={!canGoNext}
        className={cn(
          "p-3 rounded-full transition-colors shadow-sm",
          canGoNext
            ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 cursor-pointer"
            : "bg-gray-50 dark:bg-gray-900 opacity-30 cursor-not-allowed"
        )}
        aria-label="Next month"
      >
        <ChevronRight className={cn(
          "w-5 h-5",
          canGoNext ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"
        )} />
      </button>
    </div>
  );
}

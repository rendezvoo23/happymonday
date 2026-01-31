import { useDate } from "@/context/DateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { format, isSameMonth } from "date-fns";
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
import { LiquidButton } from "./button/button";

interface MonthSelectorProps {
  className?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  totalExpenses?: React.ReactNode;
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
  totalExpenses,
}: MonthSelectorProps) {
  const { selectedDate, setDate, nextMonth, prevMonth, canGoNext } = useDate();
  const { locale, t } = useTranslation();

  // Get the date-fns locale based on current language
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] || enUS;

  // Check if the selected date is the current month
  const isCurrentMonth = isSameMonth(selectedDate, new Date());

  // Use custom handlers if provided, otherwise use default from context
  const handlePrevClick = onPrevMonth || prevMonth;
  const handleNextClick = onNextMonth || nextMonth;

  // Handler to jump to current month
  const handleMonthClick = () => {
    if (!isCurrentMonth) {
      setDate(new Date());
    }
  };

  // Prevent touch events from bubbling up to prevent swipe gesture interference
  const handleTouchEvent = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <LiquidButton
        type="button"
        onClick={handlePrevClick}
        onTouchStart={handleTouchEvent}
        onTouchMove={handleTouchEvent}
        onTouchEnd={handleTouchEvent}
        aria-label="Previous month"
        variant="liquid"
        size="icon-lg"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </LiquidButton>

      <button
        type="button"
        onClick={handleMonthClick}
        className={cn(
          "text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center",
          !isCurrentMonth &&
            "cursor-pointer hover:opacity-80 transition-opacity"
        )}
      >
        {totalExpenses && (
          <>
            <p className="text-xs opacity-30 uppercase tracking-wider">
              {t("statistics.totalExpenses")}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {totalExpenses}
            </p>
          </>
        )}
        <span
          className={cn(
            "text-lg font-semibold",
            isCurrentMonth ? "text-[var(--primary-color)]" : "opacity-50"
          )}
        >
          {format(selectedDate, "MMM yyyy", { locale: dateLocale })}
        </span>
      </button>

      <LiquidButton
        type="button"
        onClick={handleNextClick}
        onTouchStart={handleTouchEvent}
        onTouchMove={handleTouchEvent}
        onTouchEnd={handleTouchEvent}
        disabled={!canGoNext}
        aria-label="Next month"
        variant="liquid"
        size="icon-lg"
      >
        <ChevronRight
          className={cn(
            "w-5 h-5",
            canGoNext
              ? "text-gray-700 dark:text-gray-300"
              : "text-gray-400 dark:text-gray-600"
          )}
        />
      </LiquidButton>
    </div>
  );
}

import { useLocale } from "@/context/LocaleContext";
import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import type { Locale } from "date-fns";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
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
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "../ui/Button";

const dateLocales: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
  de,
  ru,
  zh: zhCN,
  ja,
  pt,
  it,
  ko,
  ar,
  hi,
};

type Transaction = Tables<"transactions"> & {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
};

interface CategoryAverageChartProps {
  transactions: Transaction[];
  selectedDate: Date;
  mode?: "day" | "week" | "month";
  onPeriodClick?: (date: Date, mode: "day" | "week" | "month") => void;
  onDateChange?: (date: Date) => void;
}

export function CategoryAverageChart({
  transactions,
  selectedDate,
  mode = "week",
  onPeriodClick,
  onDateChange,
}: CategoryAverageChartProps) {
  const { formatCompactAmount, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();
  const { locale } = useLocale();
  const dateLocale = dateLocales[locale] ?? enUS;

  const weekStartsOn = 1 as const; // Monday

  // Weeks in current month (for week-mode navigation within month)
  const weeksInMonth = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks: Array<{ start: Date; end: Date }> = [];
    let current = monthStart;
    while (current <= monthEnd) {
      const weekStart = startOfWeek(current, { weekStartsOn });
      const weekEnd = endOfWeek(current, { weekStartsOn });
      weeks.push({
        start: weekStart < monthStart ? monthStart : weekStart,
        end: weekEnd > monthEnd ? monthEnd : weekEnd,
      });
      current = addDays(weekEnd, 1);
    }
    return weeks;
  }, [selectedDate]);

  // Prev/next navigation: week mode = navigate weeks within month; day mode = navigate days within month
  const { canGoPrev, canGoNext, handlePrevClick, handleNextClick } =
    useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      if (mode === "week") {
        const currentWeekIndex = weeksInMonth.findIndex((w) =>
          isWithinInterval(selectedDate, { start: w.start, end: w.end })
        );
        const idx = currentWeekIndex >= 0 ? currentWeekIndex : 0;
        return {
          canGoPrev: idx > 0,
          canGoNext: idx < weeksInMonth.length - 1 && idx >= 0,
          handlePrevClick: () => {
            if (idx > 0 && onDateChange) {
              onDateChange(weeksInMonth[idx - 1].start);
            }
          },
          handleNextClick: () => {
            if (idx < weeksInMonth.length - 1 && onDateChange) {
              onDateChange(weeksInMonth[idx + 1].start);
            }
          },
        };
      }

      if (mode === "day") {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const isFirstDay = isSameDay(dayStart, monthStart);
        const isLastDay = isSameDay(dayStart, monthEnd);
        const isTodayDate = isSameDay(dayStart, today);
        const isCurrentMonth = isSameMonth(selectedDate, today);

        return {
          canGoPrev: !isFirstDay,
          canGoNext: !isLastDay && (!isCurrentMonth || !isTodayDate),
          handlePrevClick: () => {
            if (!isFirstDay && onDateChange) {
              onDateChange(subDays(dayStart, 1));
            }
          },
          handleNextClick: () => {
            if (
              !isLastDay &&
              (!isCurrentMonth || !isTodayDate) &&
              onDateChange
            ) {
              onDateChange(addDays(dayStart, 1));
            }
          },
        };
      }

      return {
        canGoPrev: false,
        canGoNext: false,
        handlePrevClick: () => {},
        handleNextClick: () => {},
      };
    }, [mode, selectedDate, weeksInMonth, onDateChange]);

  const handleTouchEvent = (_e: React.TouchEvent) => {};

  const showNavButtons = (mode === "week" || mode === "day") && onDateChange;

  // Day mode: header (two lines) and total labels
  const dayLabels = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);
    const isCurrent = isToday(date);
    let line2: string;
    if (isToday(date)) {
      line2 = t("date.today");
    } else if (isYesterday(date)) {
      line2 = t("date.yesterday");
    } else {
      line2 = format(date, "d MMM yyyy", { locale: dateLocale });
    }
    return {
      line1: t("statistics.spending"),
      line2,
      isCurrent,
      total: isCurrent
        ? t("statistics.totalToday")
        : isYesterday(date)
          ? t("statistics.totalYesterday")
          : t("statistics.totalOnDate").replace(
              "{{date}}",
              format(date, "d MMM yyyy", { locale: dateLocale })
            ),
    };
  }, [selectedDate, t, dateLocale]);

  // Week mode: header (two lines) and total labels
  const weekLabels = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(selectedDate, { weekStartsOn });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn });

    if (isSameWeek(selectedDate, today, { weekStartsOn })) {
      return {
        line1: t("statistics.dailyAverage"),
        line2: t("date.thisWeek"),
        isCurrent: true,
        total: t("statistics.totalThisWeek"),
      };
    }
    const lastWeekStart = subWeeks(today, 1);
    if (isSameWeek(selectedDate, lastWeekStart, { weekStartsOn })) {
      return {
        line1: t("statistics.dailyAverage"),
        line2: t("date.lastWeek"),
        isCurrent: false,
        total: t("statistics.totalLastWeek"),
      };
    }
    const range = `${format(weekStart, "d MMM, EEE", { locale: dateLocale })} - ${format(weekEnd, "d MMM, EEE", { locale: dateLocale })}`;
    return {
      line1: t("statistics.dailyAverage"),
      line2: range,
      isCurrent: false,
      total: t("statistics.totalWeekRange").replace("{{range}}", range),
    };
  }, [selectedDate, t, dateLocale]);

  // Month mode: header (two lines) and total labels
  const monthLabels = useMemo(() => {
    const today = new Date();
    const isCurrent = isSameMonth(selectedDate, today);

    let line2: string;
    let total: string;
    if (isCurrent) {
      line2 = t("date.thisMonth");
      total = t("statistics.totalThisMonth");
    } else if (isSameMonth(selectedDate, subMonths(today, 1))) {
      line2 = t("date.lastMonth");
      total = t("statistics.totalLastMonth");
    } else {
      const monthName = format(selectedDate, "MMMM yyyy", {
        locale: dateLocale,
      });
      line2 = monthName;
      total = t("statistics.totalForMonth").replace("{{month}}", monthName);
    }

    return {
      line1: t("statistics.weeklyAverage"),
      line2,
      isCurrent,
      total,
    };
  }, [selectedDate, t, dateLocale]);

  // Filter only expenses
  const expenses = useMemo(() => {
    return transactions.filter((t) => t.direction === "expense");
  }, [transactions]);

  // Calculate data for the chart
  const chartData = useMemo(() => {
    if (mode === "day") {
      // Day mode: 24 hours (0-23) for the selected date
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      return Array.from({ length: 24 }, (_, hour) => {
        const hourStart = new Date(dayStart);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(dayStart);
        hourEnd.setHours(hour, 59, 59, 999);

        const hourExpenses = expenses.filter((t) => {
          if (!t.occurred_at) return false;
          const txDate = new Date(t.occurred_at);
          return txDate >= hourStart && txDate <= hourEnd;
        });

        const categoryTotals: Record<
          string,
          { amount: number; color: string; name: string }
        > = {};
        hourExpenses.forEach((t) => {
          const catId = t.category_id || "unknown";
          if (!categoryTotals[catId]) {
            categoryTotals[catId] = {
              amount: 0,
              color: getCategoryColor(t.categories?.color, t.categories?.name),
              name: t.categories?.name || "Unknown",
            };
          }
          categoryTotals[catId].amount += t.amount;
        });

        return {
          label: String(hour),
          fullLabel: `${hour}:00`,
          date: hourStart,
          categories: categoryTotals,
          total: hourExpenses.reduce((sum, t) => sum + t.amount, 0),
        };
      });
    }

    if (mode === "week") {
      // Get days of the current week
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      return days.map((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayExpenses = expenses.filter((t) => {
          if (!t.occurred_at) return false;
          const txDate = new Date(t.occurred_at);
          return txDate >= dayStart && txDate <= dayEnd;
        });

        // Group by category
        const categoryTotals: Record<
          string,
          { amount: number; color: string; name: string }
        > = {};
        dayExpenses.forEach((t) => {
          const catId = t.category_id || "unknown";
          if (!categoryTotals[catId]) {
            categoryTotals[catId] = {
              amount: 0,
              color: getCategoryColor(t.categories?.color, t.categories?.name),
              name: t.categories?.name || "Unknown",
            };
          }
          categoryTotals[catId].amount += t.amount;
        });

        const dayKeys = [
          "sun",
          "mon",
          "tue",
          "wed",
          "thu",
          "fri",
          "sat",
        ] as const;
        const dayKey = dayKeys[day.getDay()];
        const dayLabel = t(`daysShort.${dayKey}`);

        return {
          label: dayLabel,
          fullLabel: dayLabel,
          date: day,
          categories: categoryTotals,
          total: dayExpenses.reduce((sum, t) => sum + t.amount, 0),
        };
      });
    }

    // Month mode: show all weeks of the month
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks: Array<{ start: Date; end: Date }> = [];

    let current = monthStart;
    while (current <= monthEnd) {
      const weekStart = startOfWeek(current, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
      weeks.push({
        start: weekStart < monthStart ? monthStart : weekStart,
        end: weekEnd > monthEnd ? monthEnd : weekEnd,
      });
      current = addDays(weekEnd, 1);
    }

    return weeks.map((week, index) => {
      const weekExpenses = expenses.filter((t) => {
        if (!t.occurred_at) return false;
        const date = new Date(t.occurred_at);
        return date >= week.start && date <= week.end;
      });

      // Group by category
      const categoryTotals: Record<
        string,
        { amount: number; color: string; name: string }
      > = {};
      weekExpenses.forEach((t) => {
        const catId = t.category_id || "unknown";
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            amount: 0,
            color: getCategoryColor(t.categories?.color, t.categories?.name),
            name: t.categories?.name || "Unknown",
          };
        }
        categoryTotals[catId].amount += t.amount;
      });

      const weekNum = index + 1;
      return {
        label: t("statistics.weekShort").replace("{{number}}", String(weekNum)),
        fullLabel: t("statistics.weekLong").replace(
          "{{number}}",
          String(weekNum)
        ),
        date: week.start,
        categories: categoryTotals,
        total: weekExpenses.reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [expenses, selectedDate, mode, t]);

  // Calculate average
  const average = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.total, 0);
    return chartData.length > 0 ? total / chartData.length : 0;
  }, [chartData]);

  // Calculate total
  const total = useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.total, 0);
  }, [chartData]);

  // Get top 3 categories by total spending (from current period only)
  const topCategories = useMemo(() => {
    const categoryTotals: Record<
      string,
      { amount: number; color: string; name: string }
    > = {};

    // Aggregate categories from chartData (current period)
    chartData.forEach((day) => {
      Object.entries(day.categories).forEach(([catId, catData]) => {
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            amount: 0,
            color: catData.color,
            name: catData.name,
          };
        }
        categoryTotals[catId].amount += catData.amount;
      });
    });

    return Object.entries(categoryTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [chartData]);

  // Calculate max for chart scaling
  const maxAmount = useMemo(() => {
    return Math.max(...chartData.map((d) => d.total), average);
  }, [chartData, average]);

  // Calculate percentage change from previous period (skip for day mode)
  const percentageChange = useMemo(() => {
    if (mode === "day" || chartData.length < 2) return 0;

    const currentHalf = chartData.slice(Math.ceil(chartData.length / 2));
    const previousHalf = chartData.slice(0, Math.floor(chartData.length / 2));

    const currentAvg =
      currentHalf.reduce((sum, d) => sum + d.total, 0) / currentHalf.length;
    const previousAvg =
      previousHalf.reduce((sum, d) => sum + d.total, 0) / previousHalf.length;

    if (previousAvg === 0) return 0;
    return ((currentAvg - previousAvg) / previousAvg) * 100;
  }, [chartData, mode]);

  if (expenses.length === 0) {
    return (
      <div className="card-level-1 rounded-[2rem] p-6">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t("statistics.noData")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-level-1 rounded-[2rem] p-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {mode === "day" && (
            <>
              <div>{dayLabels.line1}</div>
              <div
                style={
                  dayLabels.isCurrent
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              >
                {dayLabels.line2}
              </div>
            </>
          )}
          {mode === "week" && (
            <>
              <div>{weekLabels.line1}</div>
              <div
                style={
                  weekLabels.isCurrent
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              >
                {weekLabels.line2}
              </div>
            </>
          )}
          {mode === "month" && (
            <>
              <div>{monthLabels.line1}</div>
              <div
                style={
                  monthLabels.isCurrent
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              >
                {monthLabels.line2}
              </div>
            </>
          )}
        </h3>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {mode === "day"
              ? formatCompactAmount(total)
              : formatCompactAmount(average)}
          </span>
          {percentageChange !== 0 && (
            <div className="flex items-center gap-1 text-sm mb-1">
              {percentageChange > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">
                    {Math.abs(percentageChange).toFixed(0)}%{" "}
                    {mode === "week"
                      ? t("statistics.fromLastWeek")
                      : t("statistics.fromLastMonth")}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">
                    {Math.abs(percentageChange).toFixed(0)}%{" "}
                    {mode === "week"
                      ? t("statistics.fromLastWeek")
                      : t("statistics.fromLastMonth")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        {showNavButtons && (
          <div className="absolute right-[16px] top-[16px] flex items-center gap-0">
            <Button
              type="button"
              onClick={handlePrevClick}
              onTouchStart={handleTouchEvent}
              onTouchMove={handleTouchEvent}
              onTouchEnd={handleTouchEvent}
              disabled={!canGoPrev}
              aria-label="Previous"
              variant="ghost"
              size="icon"
            >
              <ChevronLeft
                className={cn(
                  "w-5 h-5",
                  canGoPrev
                    ? "text-[var(--accent-color)]"
                    : "text-gray-300 dark:text-gray-800"
                )}
              />
            </Button>
            <Button
              type="button"
              onClick={handleNextClick}
              onTouchStart={handleTouchEvent}
              onTouchMove={handleTouchEvent}
              onTouchEnd={handleTouchEvent}
              disabled={!canGoNext}
              aria-label="Next"
              variant="ghost"
              size="icon"
            >
              <ChevronRight
                className={cn(
                  "w-5 h-5",
                  canGoNext
                    ? "text-[var(--accent-color)]"
                    : "text-gray-300 dark:text-gray-800"
                )}
              />
            </Button>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className={`relative mb-6 ${mode === "day" ? "h-52 pb-6" : "h-48"}`}>
        <div className="absolute left-0 right-8 bottom-[29px] border-b border-[var(--border-level-1)]" />
        {/* Average line */}
        {mode !== "day" && (
          <div
            className="absolute left-0 right-8 border-t border-dashed border-green-500 z-10"
            style={{
              top: `${100 - (average / maxAmount) * 80}%`,
            }}
          >
            <span
              style={{ transform: "translateX(100%)" }}
              className="absolute -right-[0px] -top-[10px] pl-1 text-xs text-green-500 font-light"
            >
              {t("statistics.average")}
            </span>
          </div>
        )}

        {/* Y-axis labels */}
        <div className="absolute right-[-8px] top-0 text-xs text-gray-400">
          <span>{formatCompactAmount(maxAmount)}</span>
        </div>

        {/* Bars */}
        <div
          className={`absolute inset-0 right-8 flex items-end ${
            mode === "day" ? "justify-around gap-0.5" : "justify-around gap-1"
          }`}
        >
          {chartData.map((day, index) => {
            const heightPercent =
              maxAmount > 0 ? (day.total / maxAmount) * 100 : 0;
            const categories = Object.entries(day.categories);

            const today = new Date();
            const isTodayBar =
              mode === "day"
                ? isSameDay(day.date, today) &&
                  day.date.getHours() === today.getHours()
                : mode === "week"
                  ? isSameDay(day.date, today)
                  : isWithinInterval(today, {
                      start: day.date,
                      end: endOfWeek(day.date, { weekStartsOn: 1 }),
                    });

            return (
              <motion.div
                key={`${day.date.toISOString()}-${index}`}
                className={`flex-1 flex flex-col items-center gap-2${isTodayBar ? " now" : ""}`}
                initial={{ height: 0 }}
                animate={{ height: "100%" }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                {/* Bar */}
                <div
                  className="w-full flex flex-col justify-end"
                  style={{ height: "85%" }}
                >
                  <div
                    className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse ${
                      (mode === "month" || mode === "week") && onPeriodClick
                        ? "cursor-pointer hover:opacity-80 transition-opacity"
                        : ""
                    }${isTodayBar ? " now" : ""}`}
                    style={{ height: `${heightPercent}%` }}
                    onClick={() => {
                      if (mode === "month" && onPeriodClick) {
                        onPeriodClick(day.date, "week");
                      }
                      if (mode === "week" && onPeriodClick) {
                        onPeriodClick(day.date, "day");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        onPeriodClick &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        if (mode === "month") {
                          e.preventDefault();
                          onPeriodClick(day.date, "week");
                        }
                        if (mode === "week") {
                          e.preventDefault();
                          onPeriodClick(day.date, "day");
                        }
                      }
                    }}
                    role={
                      (mode === "month" || mode === "week") && onPeriodClick
                        ? "button"
                        : undefined
                    }
                    tabIndex={
                      (mode === "month" || mode === "week") && onPeriodClick
                        ? 0
                        : undefined
                    }
                  >
                    {categories.map(([catId, catData], catIndex) => {
                      const catHeightPercent =
                        day.total > 0 ? (catData.amount / day.total) * 100 : 0;
                      const nextCat = categories[catIndex + 1];
                      const hasNextCat = nextCat !== undefined;

                      return (
                        <div
                          key={catId}
                          className="transition-all duration-300"
                          style={{
                            height: `${catHeightPercent}%`,
                            background: hasNextCat
                              ? `linear-gradient(to top, ${catData.color}, ${nextCat[1].color})`
                              : catData.color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Label - hide for day mode (x-axis has time labels instead) */}
                {mode !== "day" && (
                  <span
                    className={`text-xs font-medium ${
                      isTodayBar
                        ? "text-blue-500 dark:text-blue-400 font-semibold"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {day.label}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* X-axis for day mode: 0:00, 6:00, 12:00, 24:00 */}
        {mode === "day" && (
          <div className="absolute bottom-0 left-0 right-8 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        )}
      </div>

      {/* Top Categories */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {topCategories.map((cat) => (
          <div key={cat.id}>
            <div
              className="text-xs font-medium mb-1"
              style={{ color: cat.color }}
            >
              <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="truncate">{getCategoryLabel(cat.name)}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatCompactAmount(cat.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-border-subtle">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            <span
              style={
                (mode === "day" && dayLabels.isCurrent) ||
                (mode === "week" && weekLabels.isCurrent) ||
                (mode === "month" && monthLabels.isCurrent)
                  ? { color: "var(--primary-color)" }
                  : undefined
              }
            >
              {mode === "day"
                ? dayLabels.total
                : mode === "week"
                  ? weekLabels.total
                  : monthLabels.total}
            </span>
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(total)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

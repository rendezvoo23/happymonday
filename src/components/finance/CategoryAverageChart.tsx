import { Spinner } from "@/components/spinner";
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
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
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
import { useEffect, useMemo, useRef, useState } from "react";
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
  mode?: "day" | "week" | "month" | "year";
  isLoading?: boolean;
  onPeriodClick?: (date: Date, mode: "day" | "week" | "month" | "year") => void;
  onDateChange?: (date: Date) => void;
  selectedCategoryId?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
}

const SHOW_TOTAL_SECTION = false;

export function CategoryAverageChart({
  transactions,
  selectedDate,
  mode = "week",
  isLoading = false,
  onPeriodClick,
  onDateChange,
  selectedCategoryId: selectedCategoryIdProp,
  onCategorySelect,
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

  // Year mode: header (two lines) and total labels
  const yearLabels = useMemo(() => {
    const today = new Date();
    const isCurrent = isSameYear(selectedDate, today);

    let line2: string;
    let total: string;
    if (isCurrent) {
      line2 = t("date.thisYear");
      total = t("statistics.totalThisYear");
    } else if (isSameYear(selectedDate, subYears(today, 1))) {
      line2 = t("date.lastYear");
      total = t("statistics.totalLastYear");
    } else {
      const yearStr = format(selectedDate, "yyyy", { locale: dateLocale });
      line2 = yearStr;
      total = t("statistics.totalForYear").replace("{{year}}", yearStr);
    }

    return {
      line1: t("statistics.monthlyAverage"),
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

    if (mode === "year") {
      // Year mode: 12 months
      const yearStart = startOfYear(selectedDate);
      return Array.from({ length: 12 }, (_, i) => {
        const monthStartCorrect = addMonths(yearStart, i);
        const monthEnd = endOfMonth(monthStartCorrect);

        const monthExpenses = expenses.filter((t) => {
          if (!t.occurred_at) return false;
          const date = new Date(t.occurred_at);
          return date >= monthStartCorrect && date <= monthEnd;
        });

        const categoryTotals: Record<
          string,
          { amount: number; color: string; name: string }
        > = {};
        monthExpenses.forEach((t) => {
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

        const monthLabel = format(monthStartCorrect, "MMM", {
          locale: dateLocale,
        });
        return {
          label: monthLabel,
          fullLabel: format(monthStartCorrect, "MMMM yyyy", {
            locale: dateLocale,
          }),
          date: monthStartCorrect,
          categories: categoryTotals,
          total: monthExpenses.reduce((sum, t) => sum + t.amount, 0),
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
  }, [expenses, selectedDate, mode, t, dateLocale]);

  // Calculate average
  const average = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.total, 0);
    if (chartData.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // For year mode + current year: divide only by months elapsed (Jan through current month)
    if (mode === "year" && isSameYear(selectedDate, today)) {
      const currentMonth = today.getMonth() + 1; // 1-12
      return total / currentMonth;
    }
    // For month mode + current month: divide only by weeks elapsed (week 1 through current week)
    if (mode === "month" && isSameMonth(selectedDate, today)) {
      const weekIndex = chartData.findIndex((d) => {
        const weekEnd = endOfWeek(d.date, { weekStartsOn: 1 });
        return today >= d.date && today <= weekEnd;
      });
      if (weekIndex >= 0) {
        return total / (weekIndex + 1);
      }
    }
    return total / chartData.length;
  }, [chartData, mode, selectedDate]);

  // Calculate total
  const total = useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.total, 0);
  }, [chartData]);

  // All categories by total spending (from current period only)
  const allCategories = useMemo(() => {
    const categoryTotals: Record<
      string,
      { amount: number; color: string; name: string }
    > = {};

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
      .sort((a, b) => b.amount - a.amount);
  }, [chartData]);

  const [internalCategoryId, setInternalCategoryId] = useState<string | null>(
    null
  );
  const selectedCategoryId =
    onCategorySelect != null
      ? (selectedCategoryIdProp ?? null)
      : internalCategoryId;
  const setSelectedCategoryId = (id: string | null) => {
    if (onCategorySelect) {
      onCategorySelect(id);
    } else {
      setInternalCategoryId(id);
    }
  };

  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Scroll active category into view when selected (e.g. from URL)
  useEffect(() => {
    if (!selectedCategoryId) return;
    const el = categoryRefs.current[selectedCategoryId];
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    }
  }, [selectedCategoryId, allCategories]);

  // Display average (selected category's average when filtering)
  const displayAverage = useMemo(() => {
    if (selectedCategoryId) {
      const selectedTotal = chartData.reduce(
        (sum, d) => sum + (d.categories[selectedCategoryId]?.amount ?? 0),
        0
      );
      return chartData.length > 0 ? selectedTotal / chartData.length : 0;
    }
    return average;
  }, [chartData, selectedCategoryId, average]);

  // Calculate max for chart scaling (when category selected: max of that category only)
  const maxAmount = useMemo(() => {
    if (selectedCategoryId) {
      const amounts = chartData.map(
        (d) => d.categories[selectedCategoryId]?.amount ?? 0
      );
      const selectedTotal = amounts.reduce((a, b) => a + b, 0);
      const selectedAvg =
        chartData.length > 0 ? selectedTotal / chartData.length : 0;
      return Math.max(...amounts, selectedAvg);
    }
    return Math.max(...chartData.map((d) => d.total), average);
  }, [chartData, average, selectedCategoryId]);

  // Human-readable grid line values: split by 3, round each to nice steps (100, 150, 200, 250... 1000, 1250, 1500... 2500)
  const gridLineValues = useMemo(() => {
    if (maxAmount <= 0) return [];
    const baseSteps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10];
    const roundToNice = (v: number) => {
      if (v <= 0) return 0;
      const magnitude = 10 ** Math.floor(Math.log10(v));
      const normalized = v / magnitude;
      const nearestBase = baseSteps.reduce((prev, curr) =>
        Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
      );
      return nearestBase * magnitude;
    };
    const third = maxAmount / 3;
    const twoThirds = (2 * maxAmount) / 3;
    return [roundToNice(third), roundToNice(twoThirds)];
  }, [maxAmount]);

  // X-axis grid line positions (vertical lines) - align with bar/label starts
  const xGridPositions = useMemo(() => {
    if (mode === "day") {
      // 24h split into 4 parts (6h each): 0:00, 6:00, 12:00, 18:00
      return [0, 6 / 24, 12 / 24, 18 / 24];
    }
    if (mode === "week") {
      // 7 lines at start of each day
      return Array.from({ length: 7 }, (_, i) => i / 7);
    }
    if (mode === "month") {
      // Lines at start of each week (W1, W2, ...)
      const n = chartData.length;
      return Array.from({ length: n }, (_, i) => i / n);
    }
    if (mode === "year") {
      // 4 lines at start of spring (Mar), summer (Jun), fall (Sep), winter (Dec)
      return [2 / 12, 5 / 12, 8 / 12, 11 / 12];
    }
    return [];
  }, [mode, chartData.length]);

  // Calculate percentage change from previous period (skip for day mode)
  const percentageChange = useMemo(() => {
    if (mode === "day" || chartData.length < 2) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Year mode: compare full year with previous year
    if (mode === "year") {
      const yearStart = startOfYear(selectedDate);
      const prevYearStart = subYears(yearStart, 1);
      const prevYearEnd = endOfMonth(addMonths(prevYearStart, 11));

      const currentTotal = expenses
        .filter((t) => {
          if (!t.occurred_at) return false;
          const txDate = new Date(t.occurred_at);
          return (
            txDate >= yearStart &&
            txDate <= endOfMonth(addMonths(yearStart, 11))
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const prevTotal = expenses
        .filter((t) => {
          if (!t.occurred_at) return false;
          const txDate = new Date(t.occurred_at);
          return txDate >= prevYearStart && txDate <= prevYearEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      if (prevTotal === 0) return 0;
      return ((currentTotal - prevTotal) / prevTotal) * 100;
    }

    // Month mode: when current month is not ended, compare same number of days with prev month
    if (mode === "month") {
      const isCurrentMonth = isSameMonth(selectedDate, today);
      if (isCurrentMonth) {
        const dayOfMonth = today.getDate();
        const monthStart = startOfMonth(selectedDate);
        const prevMonthStart = startOfMonth(subMonths(selectedDate, 1));
        const prevMonthEnd = endOfMonth(prevMonthStart);
        const prevMonthDays = prevMonthEnd.getDate();

        const numDaysToCompare = Math.min(dayOfMonth, prevMonthDays);

        const currentPeriodEnd = new Date(monthStart);
        currentPeriodEnd.setDate(numDaysToCompare);
        currentPeriodEnd.setHours(23, 59, 59, 999);

        const prevPeriodEnd = new Date(prevMonthStart);
        prevPeriodEnd.setDate(numDaysToCompare);
        prevPeriodEnd.setHours(23, 59, 59, 999);

        const currentTotal = expenses
          .filter((t) => {
            if (!t.occurred_at) return false;
            const txDate = new Date(t.occurred_at);
            return txDate >= monthStart && txDate <= currentPeriodEnd;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        const prevTotal = expenses
          .filter((t) => {
            if (!t.occurred_at) return false;
            const txDate = new Date(t.occurred_at);
            return txDate >= prevMonthStart && txDate <= prevPeriodEnd;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        if (prevTotal === 0) return 0;
        return ((currentTotal - prevTotal) / prevTotal) * 100;
      }
    }

    // Week mode or past month: split current period into halves (not used for year)
    const currentHalf = chartData.slice(Math.ceil(chartData.length / 2));
    const previousHalf = chartData.slice(0, Math.floor(chartData.length / 2));

    const currentAvg =
      currentHalf.reduce((sum, d) => sum + d.total, 0) / currentHalf.length;
    const previousAvg =
      previousHalf.reduce((sum, d) => sum + d.total, 0) / previousHalf.length;

    if (previousAvg === 0) return 0;
    return ((currentAvg - previousAvg) / previousAvg) * 100;
  }, [chartData, mode, expenses, selectedDate]);

  const fromLabel =
    mode === "year"
      ? t("statistics.fromLastYear")
      : mode === "week"
        ? t("statistics.fromLastWeek")
        : t("statistics.fromLastMonth");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-level-1 rounded-[2rem] pt-4"
    >
      {/* Header */}
      <div className="mb-4 px-6">
        <h3 className="text-md mb-2">
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
          {mode === "year" && (
            <>
              <div>{yearLabels.line1}</div>
              <div
                style={
                  yearLabels.isCurrent
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              >
                {yearLabels.line2}
              </div>
            </>
          )}
        </h3>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {mode === "day"
              ? formatCompactAmount(
                  selectedCategoryId
                    ? chartData.reduce(
                        (s, d) =>
                          s + (d.categories[selectedCategoryId]?.amount ?? 0),
                        0
                      )
                    : total
                )
              : formatCompactAmount(displayAverage)}
          </span>
          {percentageChange !== 0 && (
            <div className="flex items-center gap-1 text-sm mb-1 leading-none">
              {percentageChange > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">
                    {Math.abs(percentageChange).toFixed(0)}% {fromLabel}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">
                    {Math.abs(percentageChange).toFixed(0)}% {fromLabel}
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
      <div
        className={`relative mb-6 mx-6 ${
          mode === "day" ? "h-52 pb-6" : mode === "year" ? "h-48" : "h-48"
        }`}
      >
        <div className="absolute left-0 right-8 bottom-[29px] border-b border-[var(--border-level-2)]" />
        {/* Grid: 2 horizontal lines with rounded amount legend (hide if 0 or < 1) */}
        {maxAmount > 0 &&
          gridLineValues
            .filter((value) => value > 0)
            .map((value) => (
              <div
                key={`h-${value}`}
                className="absolute left-0 right-8 top-0 bottom-[29px] pointer-events-none border-t border-solid border-[var(--border-level-1)]"
                style={{ top: `${85 * (1 - value / maxAmount)}%` }}
                aria-hidden
              >
                <span
                  style={{ transform: "translateX(100%)" }}
                  className="absolute -right-[0px] -top-[10px] pl-1 opacity-30 font-light text-xs"
                >
                  {formatCompactAmount(value)}
                </span>
              </div>
            ))}
        {/* X-axis line */}
        <div
          className="absolute left-0 right-8 top-0 bottom-[29px] pointer-events-none"
          aria-hidden
        >
          {xGridPositions.map((pos) => (
            <div
              key={`v-${pos}`}
              className="absolute top-0 bottom-0 border-l border-dotted border-[var(--border-level-1)]"
              style={{ left: `${pos * 100}%` }}
            />
          ))}
        </div>
        {/* Average line */}
        {mode !== "day" && maxAmount > 0 && displayAverage > 0 && (
          <div
            className="absolute left-0 right-8 border-t border-dashed border-green-500 z-10"
            style={{
              top: `${85 * (1 - displayAverage / maxAmount)}%`,
            }}
          >
            <span
              style={{ transform: "translateX(100%)" }}
              className="absolute -right-[0px] -top-[10px] pl-1 text-xs text-green-500 font-medium"
            >
              {formatCompactAmount(displayAverage)}
            </span>
          </div>
        )}

        {/* Y-axis labels */}
        <div className="absolute right-[-15px] top-0 text-xs text-gray-400">
          <span>{formatCompactAmount(maxAmount)}</span>
        </div>

        {/* Bars */}
        <div
          className={`absolute inset-0 right-8 flex items-end overflow-hidden ${
            mode === "day"
              ? "justify-around gap-0.5"
              : mode === "year"
                ? "justify-between gap-px"
                : "justify-around gap-1"
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          )}
          {chartData.map((day, index) => {
            const barValue = selectedCategoryId
              ? (day.categories[selectedCategoryId]?.amount ?? 0)
              : day.total;
            const heightPercent =
              maxAmount > 0 ? (barValue / maxAmount) * 100 : 0;
            const categories = selectedCategoryId
              ? (() => {
                  const catData = day.categories[selectedCategoryId];
                  const allCat = allCategories.find(
                    (c) => c.id === selectedCategoryId
                  );
                  return [
                    [
                      selectedCategoryId,
                      catData ?? {
                        amount: 0,
                        color: allCat?.color ?? "#999",
                        name: allCat?.name ?? "",
                      },
                    ] as [
                      string,
                      { amount: number; color: string; name: string },
                    ],
                  ];
                })()
              : Object.entries(day.categories);

            const today = new Date();
            const isTodayBar =
              mode === "day"
                ? isSameDay(day.date, today) &&
                  day.date.getHours() === today.getHours()
                : mode === "week"
                  ? isSameDay(day.date, today)
                  : mode === "year"
                    ? isSameMonth(day.date, today) &&
                      isSameYear(day.date, today)
                    : isWithinInterval(today, {
                        start: day.date,
                        end: endOfWeek(day.date, { weekStartsOn: 1 }),
                      });

            return (
              <motion.div
                key={`${day.date.toISOString()}-${index}`}
                className={`flex-1 min-w-0 flex flex-col items-center gap-2${isTodayBar ? " now" : ""}`}
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
                      (
                        mode === "month" || mode === "week" || mode === "year"
                      ) && onPeriodClick
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
                      if (mode === "year" && onPeriodClick) {
                        onPeriodClick(day.date, "month");
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
                        if (mode === "year") {
                          e.preventDefault();
                          onPeriodClick(day.date, "month");
                        }
                      }
                    }}
                    role={
                      (mode === "month" ||
                        mode === "week" ||
                        mode === "year") &&
                      onPeriodClick
                        ? "button"
                        : undefined
                    }
                    tabIndex={
                      (mode === "month" ||
                        mode === "week" ||
                        mode === "year") &&
                      onPeriodClick
                        ? 0
                        : undefined
                    }
                  >
                    {categories.map(([catId, catData], catIndex) => {
                      const catHeightPercent =
                        day.total > 0 ? (catData.amount / day.total) * 100 : 0;
                      const nextCat = categories[catIndex + 1];
                      const hasNextCat = nextCat !== undefined;
                      const isTopSegment = catIndex === categories.length - 1;
                      const showRoundedTop = selectedCategoryId && isTopSegment;

                      return (
                        <div
                          key={catId}
                          className={cn(
                            "transition-all duration-300",
                            showRoundedTop && "rounded-t-lg"
                          )}
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
                        ? "text-blue-500 dark:text-blue-400 font-light"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    style={mode === "year" ? { fontSize: "9px" } : undefined}
                  >
                    {day.label}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* X-axis for day mode: 24h split into 4 parts */}
        {mode === "day" && (
          <div className="absolute bottom-0 left-0 right-8 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </div>
        )}
      </div>

      {/* All Categories - scrollable, click to filter bars */}
      <div
        className="overflow-x-auto overflow-y-hidden no-scrollbar p-1 snap-x  scroll-pl-[26px]" /** snap-mandatory */
        style={{
          WebkitOverflowScrolling: "touch",
          paddingBottom: 26,
          paddingLeft: 26,
          paddingRight: 26,
        }}
      >
        <div className="flex flex-nowrap gap-1">
          {allCategories.map((cat) => {
            const isActive = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
                type="button"
                onClick={() => setSelectedCategoryId(isActive ? null : cat.id)}
                style={
                  isActive
                    ? {
                        // border: `1px solid ${cat.color}`,
                        boxShadow: `inset 0px 0px 1px 2px ${cat.color}`,
                      }
                    : { border: "1px solid transparent" }
                }
                className={cn(
                  "cursor-pointer rounded-[16px] p-2 transition-colors text-left w-full min-w-[45%] max-w-[45%] shrink-0 snap-always snap-start",
                  isActive
                    ? "bg-[var(--card-bg-level-3)]"
                    : "bg-[var(--card-bg-level-2)]"
                )}
              >
                <div
                  className="text-xs font-medium mb-1"
                  style={{ color: cat.color }}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="truncate">
                      {getCategoryLabel(cat.name)}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCompactAmount(cat.amount)}
                </div>
              </button>
            );
          })}
          <div className="w-3 h-10 bg-transparent shrink-0" />
        </div>
      </div>

      {/* Total */}
      {SHOW_TOTAL_SECTION && (
        <div className="pt-4 border-t border-border-subtle">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span
                style={
                  (mode === "day" && dayLabels.isCurrent) ||
                  (mode === "week" && weekLabels.isCurrent) ||
                  (mode === "month" && monthLabels.isCurrent) ||
                  (mode === "year" && yearLabels.isCurrent)
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              >
                {mode === "day"
                  ? dayLabels.total
                  : mode === "week"
                    ? weekLabels.total
                    : mode === "year"
                      ? yearLabels.total
                      : monthLabels.total}
              </span>
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(total)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

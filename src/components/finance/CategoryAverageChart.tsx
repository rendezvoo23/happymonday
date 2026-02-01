import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { getCategoryColor } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

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
  mode?: "week" | "month";
  onPeriodClick?: (date: Date, mode: "week" | "month") => void;
}

export function CategoryAverageChart({
  transactions,
  selectedDate,
  mode = "week",
  onPeriodClick,
}: CategoryAverageChartProps) {
  const { formatCompactAmount, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  // Filter only expenses
  const expenses = useMemo(() => {
    return transactions.filter((t) => t.direction === "expense");
  }, [transactions]);

  // Calculate data for the chart
  const chartData = useMemo(() => {
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

        return {
          label: format(day, "EEE").substring(0, 1), // M, T, W, etc.
          fullLabel: format(day, "EEE"),
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

      return {
        label: `W${index + 1}`,
        fullLabel: `Week ${index + 1}`,
        date: week.start,
        categories: categoryTotals,
        total: weekExpenses.reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [expenses, selectedDate, mode]);

  // Calculate average
  const average = useMemo(() => {
    const total = chartData.reduce((sum, day) => sum + day.total, 0);
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

  // Calculate percentage change from previous period
  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;

    const currentHalf = chartData.slice(Math.ceil(chartData.length / 2));
    const previousHalf = chartData.slice(0, Math.floor(chartData.length / 2));

    const currentAvg =
      currentHalf.reduce((sum, d) => sum + d.total, 0) / currentHalf.length;
    const previousAvg =
      previousHalf.reduce((sum, d) => sum + d.total, 0) / previousHalf.length;

    if (previousAvg === 0) return 0;
    return ((currentAvg - previousAvg) / previousAvg) * 100;
  }, [chartData]);

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
          {mode === "week"
            ? t("statistics.dailyAverage")
            : t("statistics.weeklyAverage")}
        </h3>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {formatCompactAmount(average)}
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
      </div>

      {/* Bar Chart */}
      <div className="relative h-48 mb-6">
        {/* Average line */}
        <div
          className="absolute left-0 right-8 border-t-2 border-dashed border-green-500 z-10"
          style={{
            top: `${100 - (average / maxAmount) * 80}%`,
          }}
        >
          <span className="absolute -right-6 -top-[10px] text-xs text-green-500 font-medium">
            {t("statistics.average")}
          </span>
        </div>

        {/* Y-axis labels */}
        <div className="absolute right-0 top-0 text-xs text-gray-400">
          <span>{formatCompactAmount(maxAmount)}</span>
        </div>

        {/* Bars */}
        <div className="absolute inset-0 right-8 flex items-end justify-around gap-1">
          {chartData.map((day, index) => {
            const heightPercent =
              maxAmount > 0 ? (day.total / maxAmount) * 100 : 0;
            const categories = Object.entries(day.categories);

            return (
              <motion.div
                key={`${day.date.toISOString()}-${index}`}
                className="flex-1 flex flex-col items-center gap-2"
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
                      mode === "month" && onPeriodClick
                        ? "cursor-pointer hover:opacity-80 transition-opacity"
                        : ""
                    }`}
                    style={{ height: `${heightPercent}%` }}
                    onClick={() => {
                      if (mode === "month" && onPeriodClick) {
                        onPeriodClick(day.date, "week");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        mode === "month" &&
                        onPeriodClick &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        onPeriodClick(day.date, "week");
                      }
                    }}
                    role={
                      mode === "month" && onPeriodClick ? "button" : undefined
                    }
                    tabIndex={mode === "month" && onPeriodClick ? 0 : undefined}
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

                {/* Label */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {day.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Top Categories */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {topCategories.map((cat) => (
          <div key={cat.id}>
            <p
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
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatCompactAmount(cat.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-border-subtle">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {mode === "week"
              ? t("statistics.totalThisWeek")
              : t("statistics.totalThisMonth")}
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(total)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

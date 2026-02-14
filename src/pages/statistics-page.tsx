import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryAverageChart } from "@/components/finance/CategoryAverageChart";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { ConfirmAction } from "@/components/modals/confirm-action";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useLocale } from "@/context/LocaleContext";
import {
  useDeleteTransaction,
  useMonthTransactionsWithCategories,
} from "@/hooks/use-transactions-query";
import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  addMonths,
  endOfWeek,
  format,
  isSameMonth,
  isSameWeek,
  isToday,
  isYesterday,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { Locale } from "date-fns";
import { de, enUS, es, fr, it, pt, ru, zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MODE_SCHEMA = ["day", "week", "month"] as const;

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const dateLocales: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
  de,
  ru,
  zh: zhCN,
  pt,
  it,
};

type ChartMode = "day" | "week" | "month";

interface StatisticsPageProps {
  selectedMonth?: string;
}

export function StatisticsPage(props: StatisticsPageProps = {}) {
  const { selectedMonth: propsMonth } = props;
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    month?: string;
    mode?: string;
    category?: string;
  };
  const urlMonth =
    search?.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month)
      ? search.month
      : undefined;
  const urlMode =
    search?.mode && MODE_SCHEMA.includes(search.mode as ChartMode)
      ? (search.mode as ChartMode)
      : undefined;
  const categoryParam = search?.category;
  const { selectedDate, setDate, prevMonth, nextMonth } = useDate();
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateLocale = dateLocales[locale] ?? enUS;
  const { getCategoryById } = useCategoryStore();
  const { getCategoryLabel } = useCategoryLabel();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch data with TanStack Query (includes full category and subcategory data)
  const { data: transactionsData = [] } =
    useMonthTransactionsWithCategories(selectedDate);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>(urlMode || "month");

  // Sync URL <-> selected month & mode (for reload persistence)
  const updateUrl = useCallback(
    (date: Date, mode: ChartMode, category?: string) => {
      navigate({
        to: "/statistics",
        search: {
          month: getMonthKey(date),
          mode,
          category: category ?? undefined,
        },
        replace: true,
      });
    },
    [navigate]
  );

  // Sync URL <-> date (from search param or path param like /statistics/2025-02)
  const monthFromUrl = urlMonth || propsMonth;
  useEffect(() => {
    if (monthFromUrl) {
      const parsed = parseMonthKey(monthFromUrl);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // When viewing current month, default to today so week/day mode shows current period
      const initialDate = isSameMonth(parsed, today) ? today : parsed;
      if (!isSameMonth(selectedDate, parsed)) {
        setDate(initialDate);
      }
      // If we came from path param (propsMonth), normalize to search params
      if (propsMonth && !urlMonth) {
        updateUrl(initialDate, urlMode || chartMode, categoryParam);
      }
    } else {
      updateUrl(selectedDate, chartMode, categoryParam);
    }
  }, [monthFromUrl]);

  useEffect(() => {
    if (urlMode && urlMode !== chartMode) {
      setChartMode(urlMode);
    }
  }, [urlMode]);

  // Custom prev/next that update URL
  const handlePrevMonth = useCallback(() => {
    const newDate = subMonths(selectedDate, 1);
    prevMonth();
    updateUrl(newDate, chartMode, categoryParam);
  }, [selectedDate, chartMode, categoryParam, prevMonth, updateUrl]);

  const handleNextMonth = useCallback(() => {
    const newDate = addMonths(selectedDate, 1);
    nextMonth();
    updateUrl(newDate, chartMode, categoryParam);
  }, [selectedDate, chartMode, categoryParam, nextMonth, updateUrl]);

  const handleChartModeChange = useCallback(
    (mode: ChartMode) => {
      setChartMode(mode);
      updateUrl(selectedDate, mode, categoryParam);
    },
    [selectedDate, categoryParam, updateUrl]
  );

  // Handle period click (week click in month mode, day click in week mode)
  const handlePeriodClick = (date: Date, mode: ChartMode) => {
    setDate(date);
    setChartMode(mode);
    updateUrl(date, mode, categoryParam);
  };

  // Handle prev/next navigation within week or day mode (stays in current month)
  const handleDateChange = useCallback(
    (date: Date) => {
      setDate(date);
      updateUrl(date, chartMode, categoryParam);
    },
    [chartMode, categoryParam, setDate, updateUrl]
  );

  // Data is already in the correct format with categories and subcategories joined
  const transactions = useMemo(() => {
    return transactionsData;
  }, [transactionsData]);

  // Filter transactions for the list by selected period (week/day) and category
  const listTransactions = useMemo(() => {
    let filtered = transactions;
    const weekStartsOn = 1;

    if (chartMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn });
      filtered = filtered.filter((t) => {
        if (!t.occurred_at) return false;
        const txDate = new Date(t.occurred_at);
        return txDate >= weekStart && txDate <= weekEnd;
      });
    } else if (chartMode === "day") {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        if (!t.occurred_at) return false;
        const txDate = new Date(t.occurred_at);
        return txDate >= dayStart && txDate <= dayEnd;
      });
    }

    if (categoryParam) {
      filtered = filtered.filter((t) => t.category_id === categoryParam);
    }

    return filtered;
  }, [transactions, chartMode, selectedDate, categoryParam]);

  // Calculate total expenses for the selected month
  const totalExpenses = useMemo(() => {
    const expenses = transactions.filter((t) => t.direction === "expense");
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    return total;
  }, [transactions]);

  // Derived reactive spend by category data
  const spendByCategory = useMemo(() => {
    const expenses = transactions.filter((t) => t.direction === "expense");
    const grouped: Record<
      string,
      {
        amount: number;
        label: string;
        color: string;
        subcategories: Record<
          string,
          { label: string; amount: number; icon?: string }
        >;
      }
    > = {};

    expenses.forEach((t) => {
      const catId = t.category_id || "unknown";
      if (!grouped[catId]) {
        grouped[catId] = {
          amount: 0,
          label: t.categories?.name || "Unknown",
          color: getCategoryColor(t.categories?.color, t.categories?.name),
          subcategories: {},
        };
      }
      grouped[catId].amount += t.amount;

      // Aggregate subcategory data
      if (t.subcategories) {
        const subId = t.subcategories.id;
        if (!grouped[catId].subcategories[subId]) {
          grouped[catId].subcategories[subId] = {
            label: t.subcategories.name,
            amount: 0,
            icon: t.subcategories.icon || undefined,
          };
        }
        grouped[catId].subcategories[subId].amount += t.amount;
      }
    });

    return Object.entries(grouped)
      .map(([id, val]) => ({
        categoryId: id,
        amount: val.amount,
        label: val.label,
        color: val.color,
        subcategories: Object.entries(val.subcategories).map(
          ([subId, subVal]) => ({
            id: subId,
            ...subVal,
          })
        ),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Localized time window label for transaction list description
  const timeWindowLabel = useMemo(() => {
    const today = new Date();
    if (chartMode === "day") {
      if (isToday(selectedDate)) return t("date.today");
      if (isYesterday(selectedDate)) return t("date.yesterday");
      return format(selectedDate, "d MMM yyyy", { locale: dateLocale });
    }
    if (chartMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      if (isSameWeek(selectedDate, today, { weekStartsOn: 1 })) {
        return t("date.thisWeek");
      }
      return `${format(weekStart, "d MMM", { locale: dateLocale })} - ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`;
    }
    // month
    if (isSameMonth(selectedDate, today)) return t("date.thisMonth");
    return format(selectedDate, "MMMM yyyy", { locale: dateLocale });
  }, [chartMode, selectedDate, t, dateLocale]);

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      updateUrl(selectedDate, chartMode, categoryId ?? undefined);
    },
    [selectedDate, chartMode, updateUrl]
  );

  const handleEdit = (transaction: { id: string }) => {
    navigate({ to: "/edit/$id", params: { id: transaction.id } });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteTransactionMutation.mutateAsync(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <PageShell>
        <Header>
          <MonthSelector
            totalExpenses={formatAmount(totalExpenses)}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </Header>

        <main
          className="flex flex-col items-center gap-4 pb-32 px-4"
          style={{ overflowX: "hidden" }}
        >
          {/* Average Expenses Chart */}
          {transactions.length > 0 && (
            <div id="average-chart" className="w-full scroll-mt-24 space-y-3">
              {/* Mode Toggle */}
              <div className="flex gap-2 justify-center items-center w-full">
                <div className="flex items-center justify-center gap-0 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <button
                    type="button"
                    onClick={() => handleChartModeChange("day")}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartMode === "day"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("statistics.day")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChartModeChange("week")}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartMode === "week"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("statistics.week")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChartModeChange("month")}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartMode === "month"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("statistics.month")}
                  </button>
                </div>
              </div>

              <CategoryAverageChart
                transactions={transactions}
                selectedDate={selectedDate}
                mode={chartMode}
                onPeriodClick={handlePeriodClick}
                onDateChange={handleDateChange}
              />
            </div>
          )}

          <div id="doughnut" className="w-full scroll-mt-24">
            <CategoryDoughnutChart
              spendByCategory={spendByCategory}
              initialExpandedCategory={categoryParam}
              onCategorySelect={handleCategorySelect}
            />
          </div>

          {/* Charts */}
          {transactions.length > 0 && false && (
            <div id="charts" className="w-full scroll-mt-24">
              <AnalyticsCharts transactions={transactions} />
            </div>
          )}

          <ConfirmAction
            title={t("statistics.deleteTransaction")}
            description={t("statistics.deleteConfirmation")}
            onAction={confirmDelete}
            onClose={() => setIsDeleteModalOpen(false)}
            isDestructive
            open={isDeleteModalOpen}
          />

          {/* Recent Transactions List - time window + optional category filter badge */}
          <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {timeWindowLabel}
              </span>
              {categoryParam && (() => {
                const category = getCategoryById(categoryParam);
                const categoryColor =
                  getCategoryColor(category?.color, category?.name) ?? "#6B7280";
                return (
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(null)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: categoryColor }}
                  >
                    {getCategoryLabel(category?.name ?? categoryParam)}
                    <X className="w-3.5 h-3.5" />
                  </button>
                );
              })()}
            </div>

            {/* Recent Transactions List - grouped by day, filtered by period & category */}
            <div className="w-full space-y-4">
              <TransactionList
                transactions={listTransactions}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                limit={20}
                groupByDay
              />
            </div>
          </div>

          <motion.div
            className="w-full text-center"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <Button
              variant="ghost"
              className="mt-5"
              style={{ color: "var(--accent-color)" }}
              onClick={() => navigate({ to: "/statistics/history" })}
            >
              {t("transactions.viewAll")}
            </Button>
          </motion.div>
        </main>
      </PageShell>
    </motion.div>
  );
}

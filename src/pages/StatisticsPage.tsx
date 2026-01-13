import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { PageShell } from "@/components/layout/PageShell";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { type PanInfo, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export function StatisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, loadTransactions, isLoading } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, nextMonth, prevMonth } = useDate();

  useEffect(() => {
    loadTransactions(selectedDate);
    loadCategories();
  }, [selectedDate]);

  // Scroll to hash on mount or hash change
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location.hash, isLoading]);

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

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      nextMonth();
    } else if (info.offset.x > threshold) {
      prevMonth();
    }
  };

  return (
    <PageShell>
      <header className="relative flex flex-col items-center pt-4 pb-8">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="absolute left-4 top-4 p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm text-gray-600 hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <MonthSelector />
      </header>

      <main className="flex flex-col items-center gap-4 pb-32">
        {isLoading && <div className="text-gray-500 mt-10">Loading...</div>}

        {/* Category Doughnut Chart */}
        {!isLoading && (
          <motion.div
            id="doughnut"
            className="w-full scroll-mt-24"
            onPanEnd={handlePanEnd}
          >
            <CategoryDoughnutChart spendByCategory={spendByCategory} />
          </motion.div>
        )}

        {/* Charts */}
        <div id="charts" className="w-full scroll-mt-24">
          <AnalyticsCharts transactions={transactions} />
        </div>
      </main>
    </PageShell>
  );
}

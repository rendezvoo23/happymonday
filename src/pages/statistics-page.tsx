import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryAverageChart } from "@/components/finance/CategoryAverageChart";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import {
  useDeleteTransaction,
  useMonthTransactionsWithCategories,
} from "@/hooks/use-transactions-query";
import { useCurrency } from "@/hooks/useCurrency";
import { getCategoryColor } from "@/stores/categoryStore";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

interface StatisticsPageProps {
  selectedMonth?: string;
}

export function StatisticsPage(_props: StatisticsPageProps = {}) {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const { selectedDate } = useDate();
  const { formatAmount } = useCurrency();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch data with TanStack Query (includes full category and subcategory data)
  const { data: transactionsData = [] } =
    useMonthTransactionsWithCategories(selectedDate);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"week" | "month">("week");

  // Get category from URL params
  const categoryParam = (searchParams as any)?.category;

  // Data is already in the correct format with categories and subcategories joined
  const transactions = useMemo(() => {
    return transactionsData;
  }, [transactionsData]);

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
          <MonthSelector totalExpenses={formatAmount(totalExpenses)} />
        </Header>

        <main className="flex flex-col items-center gap-4 pb-32 px-4">
          {/* Average Expenses Chart */}
          {transactions.length > 0 && (
            <div id="average-chart" className="w-full scroll-mt-24 space-y-3">
              {/* Mode Toggle */}
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setChartMode("week")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    chartMode === "week"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("month")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    chartMode === "month"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Month
                </button>
              </div>
              
              <CategoryAverageChart
                transactions={transactions}
                selectedDate={selectedDate}
                mode={chartMode}
              />
            </div>
          )}

          <div id="doughnut" className="w-full scroll-mt-24">
            <CategoryDoughnutChart
              spendByCategory={spendByCategory}
              initialExpandedCategory={categoryParam}
            />
          </div>

          {/* Charts */}
          {transactions.length > 0 && (
            <div id="charts" className="w-full scroll-mt-24">
              <AnalyticsCharts transactions={transactions} />
            </div>
          )}

          {/* Recent Transactions List */}
          <div className="w-full mt-4 space-y-4">
            <TransactionList
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              limit={5}
            />
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Transaction"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirmDelete}
                disabled={deleteTransactionMutation.isPending}
              >
                {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      </PageShell>
    </motion.div>
  );
}

import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { type PanInfo, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export function StatisticsPage() {
  const navigate = useNavigate();
  const { transactions, loadTransactions, deleteTransaction, isLoading } =
    useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, nextMonth, prevMonth } = useDate();

  useEffect(() => {
    loadTransactions(selectedDate);
    loadCategories();
  }, [selectedDate]);

  // Derived reactive spend by category data
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

  // State for delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEdit = (transaction: { id: string }) => {
    navigate(`/edit/${transaction.id}`);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      deleteTransaction(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

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
      <header className="relative flex flex-col items-center pt-4 pb-6 gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-5 p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm text-gray-600 hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Statistics</h1>
        <MonthSelector />
      </header>

      <main className="flex flex-col items-center gap-8 pb-20">
        {isLoading && <div className="text-gray-500">Loading...</div>}

        {/* Category Doughnut Chart - at top */}
        {!isLoading && (
          <motion.div className="w-full" onPanEnd={handlePanEnd}>
            <CategoryDoughnutChart spendByCategory={spendByCategory} />
          </motion.div>
        )}

        {/* Charts */}
        <AnalyticsCharts transactions={transactions} />

        {/* List */}
        <TransactionList
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          limit={5}
        />
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Transaction"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

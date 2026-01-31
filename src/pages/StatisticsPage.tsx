import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function StatisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, loadTransactions, deleteTransaction, isLoading } =
    useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate } = useDate();
  const { formatAmount } = useCurrency();

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Get category from URL params
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get("category");

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

  return (
    <PageShell>
      <Header>
        <MonthSelector totalExpenses={formatAmount(totalExpenses)} />
      </Header>

      <main className="flex flex-col items-center gap-4 pb-32 px-4">
        <div id="doughnut" className="w-full scroll-mt-24">
          <CategoryDoughnutChart
            spendByCategory={spendByCategory}
            initialExpandedCategory={categoryParam}
          />
        </div>

        {/* Charts */}
        <div id="charts" className="w-full scroll-mt-24">
          <AnalyticsCharts transactions={transactions} />
        </div>

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

import { AnalyticsWidgets } from "@/components/finance/AnalyticsWidgets";
import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { TransactionList } from "@/components/finance/TransactionList";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { supabase } from "@/lib/supabaseClient";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { type PanInfo, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function HomePage() {
  const navigate = useNavigate();
  const { transactions, loadTransactions, deleteTransaction, isLoading } =
    useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, nextMonth, prevMonth } = useDate();

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Sparkline data state
  const [chartData, setChartData] = useState<
    { current: number; previous: number }[]
  >([]);
  const [trendStats, setTrendStats] = useState({
    percentChange: 0,
    isIncrease: false,
  });

  useEffect(() => {
    loadTransactions(selectedDate);
    loadCategories();
    fetchTrendData();
  }, [selectedDate, loadTransactions, loadCategories]);

  const fetchTrendData = async () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const prevDate = subMonths(selectedDate, 1);
    const prevStart = startOfMonth(prevDate);
    const prevEnd = endOfMonth(prevDate);

    const { data: currentTx } = await supabase
      .from("transactions")
      .select("amount, occurred_at")
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .is("deleted_at", null)
      .eq("direction", "expense");

    const { data: prevTx } = await supabase
      .from("transactions")
      .select("amount, occurred_at")
      .gte("occurred_at", prevStart.toISOString())
      .lte("occurred_at", prevEnd.toISOString())
      .is("deleted_at", null)
      .eq("direction", "expense");

    const currentExpenses = currentTx || [];
    const prevExpenses = prevTx || [];
    const currentTotal = currentExpenses.reduce((acc, t) => acc + t.amount, 0);
    const prevTotal = prevExpenses.reduce((acc, t) => acc + t.amount, 0);

    const interval = eachDayOfInterval({ start, end });
    const prevInterval = eachDayOfInterval({ start: prevStart, end: prevEnd });

    const processedChartData = interval.map((date, i) => {
      const dayStr = format(date, "yyyy-MM-dd");
      const curAmt = currentExpenses
        .filter((t) => t.occurred_at.startsWith(dayStr))
        .reduce((acc, t) => acc + t.amount, 0);

      let prevAmt = 0;
      if (prevInterval[i]) {
        const pDayStr = format(prevInterval[i], "yyyy-MM-dd");
        prevAmt = prevExpenses
          .filter((t) => t.occurred_at.startsWith(pDayStr))
          .reduce((acc, t) => acc + t.amount, 0);
      }

      return { current: curAmt, previous: prevAmt };
    });

    const absoluteChange = currentTotal - prevTotal;
    const percentChange =
      prevTotal > 0 ? (absoluteChange / prevTotal) * 100 : 0;

    setChartData(processedChartData);
    setTrendStats({
      percentChange: Math.abs(percentChange),
      isIncrease: absoluteChange > 0,
    });
  };

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

      if (t.subcategories) {
        const subId = t.subcategories.id;
        if (!grouped[catId].subcategories[subId]) {
          grouped[catId].subcategories[subId] = {
            label: t.subcategories.name,
            amount: 0,
            icon: t.subcategories.icon ?? undefined,
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
            icon: subVal.icon ?? undefined,
          })
        ),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const handleOpenAdd = (type: TransactionDirection) => {
    navigate(
      `/add?type=${type}&month=${selectedDate.getMonth() + 1}&year=${selectedDate.getFullYear()}`
    );
  };

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
    <>
      <PageShell>
        <header className="flex flex-col items-center pt-4 pb-8">
          <MonthSelector />
        </header>

        <main className="flex flex-col items-center gap-4 pb-32">
          {isLoading ? (
            <div className="text-gray-500 mt-10">Loading transactions...</div>
          ) : (
            <motion.div
              className="w-full flex justify-center"
              onPanEnd={handlePanEnd}
            >
              <BubblesCluster transactions={transactions} mode="cluster" />
            </motion.div>
          )}

          {/* Redesigned "+" Button */}
          <div className="relative">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full shadow-lg text-white border-2 border-white flex items-center justify-center overflow-hidden bg-[#007AFF] hover:bg-[#0071e3]"
              onClick={() => handleOpenAdd("expense")}
            >
              <Plus className="w-8 h-8 drop-shadow-sm" />
            </Button>
          </div>

          <div className="w-full mt-2">
            <AnalyticsWidgets
              spendByCategory={spendByCategory}
              chartData={chartData}
              percentChange={trendStats.percentChange}
              isIncrease={trendStats.isIncrease}
              onDoughnutClick={() => navigate("/statistics")}
              onChartClick={() => navigate("/statistics")}
              currentMonthName={format(selectedDate, "MMM")}
              prevMonthName={format(subMonths(selectedDate, 1), "MMM")}
            />
          </div>

          {/* Recent Transactions List */}
          <div className="w-full px-4 space-y-4">
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
              <Button variant="danger" fullWidth onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </PageShell>
    </>
  );
}

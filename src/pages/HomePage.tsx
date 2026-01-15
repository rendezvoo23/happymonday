import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function HomePage() {
  const navigate = useNavigate();
  const { transactions, loadTransactions, isLoading } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate } = useDate();
  const { formatAmount } = useCurrency();

  useEffect(() => {
    loadTransactions(selectedDate);
    loadCategories();
  }, [selectedDate, loadTransactions, loadCategories]);

  // Calculate total expenses for the selected month
  const totalExpenses = useMemo(() => {
    const expenses = transactions.filter((t) => t.direction === "expense");
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    return total;
  }, [transactions]);

  const handleOpenAdd = (type: TransactionDirection) => {
    navigate(
      `/add?type=${type}&month=${selectedDate.getMonth() + 1}&year=${selectedDate.getFullYear()}`
    );
  };

  return (
    <>
      <PageShell allowScroll={false}>
        <header className="flex flex-col items-center pt-2 pb-4">
          <MonthSelector />
        </header>

        <main className="flex flex-col items-center gap-2 pb-10">
          <div className="w-full flex justify-center">
            {isLoading && transactions.length === 0 ? (
              <div className="text-gray-500 mt-6 h-40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <BubblesCluster
                transactions={transactions}
                mode="cluster"
                height={280}
              />
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Spending
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(totalExpenses)}
            </p>
          </div>

          <div className="mt-28 flex justify-center">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full shadow-2xl text-white dark:text-black border-2 border-black dark:border-white flex items-center justify-center overflow-hidden bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 transition-transform active:scale-95 z-50"
              onClick={() => handleOpenAdd("expense")}
            >
              <Plus className="w-8 h-8" />
            </Button>
          </div>
        </main>
      </PageShell>
    </>
  );
}

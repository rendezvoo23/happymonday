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
      <PageShell>
        <header className="flex flex-col items-center pt-4 pb-8">
          <MonthSelector />
        </header>

        <main className="flex flex-col items-center gap-4 pb-32">
          <div className="w-full flex justify-center">
            {isLoading && transactions.length === 0 ? (
              <div className="text-gray-500 mt-10 h-52 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <BubblesCluster transactions={transactions} mode="cluster" />
            )}
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(totalExpenses)}
            </p>
          </div>

          {/* Floating thumb-friendly "+" Button */}
          <div className="fixed bottom-48 left-1/2 -translate-x-1/2 z-40">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full shadow-lg text-white border-2 border-white flex items-center justify-center overflow-hidden bg-[#007AFF] hover:bg-[#0071e3] transition-transform active:scale-90"
              onClick={() => handleOpenAdd("expense")}
            >
              <Plus className="w-8 h-8 drop-shadow-sm" />
            </Button>
          </div>
        </main>
      </PageShell>
    </>
  );
}

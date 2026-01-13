import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function HomePage() {
  const navigate = useNavigate();
  const { transactions, loadTransactions, isLoading } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate } = useDate();

  useEffect(() => {
    loadTransactions(selectedDate);
    loadCategories();
  }, [selectedDate, loadTransactions, loadCategories]);

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
          {isLoading ? (
            <div className="text-gray-500 mt-10">Loading transactions...</div>
          ) : (
            <div className="w-full flex justify-center">
              <BubblesCluster transactions={transactions} mode="cluster" />
            </div>
          )}

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

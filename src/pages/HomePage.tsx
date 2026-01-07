import { useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { Button } from "@/components/ui/Button";
import { useTransactionStore } from "@/stores/transactionStore";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { DynamicBackground } from "@/components/layout/DynamicBackground";
import type { Enums } from "@/types/supabase";

type TransactionDirection = Enums<'transaction_direction'>;

export function HomePage() {
    const navigate = useNavigate();
    const { transactions, loadTransactions, isLoading, getTotalIncome, getTotalExpenses } = useTransactionStore();
    const { selectedDate } = useDate();

    useEffect(() => {
        loadTransactions(selectedDate);
    }, [selectedDate, loadTransactions]);

    const handleOpenAdd = (type: TransactionDirection) => {
        navigate(`/add?type=${type}&month=${selectedDate.getMonth() + 1}&year=${selectedDate.getFullYear()}`);
    };

    return (
        <>
            <DynamicBackground transactions={transactions} />
            <PageShell>
                <header className="flex flex-col items-center pt-4 pb-8">
                    <MonthSelector />
                </header>

                <main className="flex flex-col items-center gap-8">
                    {isLoading ? (
                        <div className="text-gray-500 mt-10">Loading transactions...</div>
                    ) : (
                        <BubblesCluster transactions={transactions} mode="cluster" />
                    )}

                    {/* Floating Action Button */}
                    <div className="relative">
                        <Button
                            size="icon"
                            className="w-16 h-16 rounded-full shadow-soft bg-black text-white"
                            onClick={() => handleOpenAdd('expense')}
                        >
                            <Plus className="w-8 h-8" />
                        </Button>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-4 px-4">
                        <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Income</p>
                            <p className="text-xl font-bold text-green-600">
                                ${getTotalIncome().toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Expenses</p>
                            <p className="text-xl font-bold text-red-500">
                                ${getTotalExpenses().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </main>
            </PageShell>
        </>
    );
}

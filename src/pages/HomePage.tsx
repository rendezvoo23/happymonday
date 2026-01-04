

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { Button } from "@/components/ui/Button";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionType } from "@/types";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";

import { DynamicBackground } from "@/components/layout/DynamicBackground";

export function HomePage() {
    const navigate = useNavigate();
    const { getTransactionsByMonth } = useTransactions();
    const { selectedDate } = useDate();

    // Get filtered transactions for the selected month
    const monthlyTransactions = getTransactionsByMonth(selectedDate);

    const handleOpenAdd = (type: TransactionType) => {
        navigate(`/add?type=${type}`);
    };

    return (
        <>
            <DynamicBackground transactions={monthlyTransactions} />
            <PageShell>
                <header className="flex flex-col items-center pt-4 pb-8">
                    <MonthSelector />
                </header>

                <main className="flex flex-col items-center gap-8">
                    <BubblesCluster transactions={monthlyTransactions} mode="cluster" />

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
                                ${monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Expenses</p>
                            <p className="text-xl font-bold text-red-500">
                                ${monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </main>
            </PageShell>
        </>
    );
}

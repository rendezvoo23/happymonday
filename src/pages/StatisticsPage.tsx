import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth } from "date-fns";
import { PageShell } from "@/components/layout/PageShell";
import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { CategoryDoughnutChart } from "@/components/finance/CategoryDoughnutChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useTransactionStore } from "@/stores/transactionStore";
import { useCategoryStore, getCategoryColor } from "@/stores/categoryStore";
import { useDate } from "@/context/DateContext";
import { supabase } from "@/lib/supabaseClient";

export function StatisticsPage() {
    const navigate = useNavigate();
    const { transactions, loadTransactions, deleteTransaction, isLoading, getTotalIncome, getTotalExpenses } = useTransactionStore();
    const { loadCategories } = useCategoryStore();
    const { selectedDate } = useDate();
    const [spendByCategory, setSpendByCategory] = useState<any[]>([]);

    useEffect(() => {
        loadTransactions(selectedDate);
        loadCategories();

        // Fetch spend by category using Supabase directly
        const fetchSpendByCategory = async () => {
            const start = startOfMonth(selectedDate).toISOString();
            const end = endOfMonth(selectedDate).toISOString();

            const { data, error } = await supabase
                .from('transactions')
                .select('amount, category_id, categories(name, color)')
                .eq('direction', 'expense')
                .gte('occurred_at', start)
                .lt('occurred_at', end)
                .is('deleted_at', null);

            if (error) {
                console.error('Failed to load spend by category', error);
                return;
            }

            const grouped: Record<string, { amount: number; label: string; color: string }> = {};
            data?.forEach((t: any) => {
                const catId = t.category_id;
                if (!grouped[catId]) {
                    grouped[catId] = {
                        amount: 0,
                        label: t.categories?.name || 'Unknown',
                        color: getCategoryColor(t.categories?.color, t.categories?.name),
                    };
                }
                grouped[catId].amount += t.amount;
            });

            setSpendByCategory(Object.entries(grouped).map(([id, val]) => ({
                categoryId: id,
                ...val,
            })));
        };

        fetchSpendByCategory();
    }, [selectedDate, loadTransactions, loadCategories]);



    // State for delete confirmation
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleEdit = (transaction: any) => {
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
            <header className="flex flex-col items-center pt-4 pb-6 gap-4">
                <h1 className="text-xl font-semibold text-gray-900">Statistics</h1>
                <MonthSelector />
                {/* Summary Cards */}
                <div className="flex gap-4 w-full px-4">
                    <div className="flex-1 bg-green-50 p-4 rounded-xl text-center">
                        <p className="text-sm text-green-600 font-medium">Income</p>
                        <p className="text-xl font-bold text-green-700">${getTotalIncome().toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-red-50 p-4 rounded-xl text-center">
                        <p className="text-sm text-red-600 font-medium">Expenses</p>
                        <p className="text-xl font-bold text-red-700">${getTotalExpenses().toLocaleString()}</p>
                    </div>
                </div>
            </header>

            <main className="flex flex-col items-center gap-8 pb-20">

                {isLoading && <div className="text-gray-500">Loading...</div>}

                {/* Category Doughnut Chart - at top */}
                {!isLoading && <CategoryDoughnutChart spendByCategory={spendByCategory} />}

                {/* Charts */}
                <AnalyticsCharts transactions={transactions} />

                {/* List */}
                <TransactionList
                    transactions={transactions}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
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
                        Are you sure you want to delete this transaction? This action cannot be undone.
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
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageShell>
    );
}

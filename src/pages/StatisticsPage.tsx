import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth } from "date-fns";
import { PageShell } from "@/components/layout/PageShell";
import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { AnalyticsCharts } from "@/components/finance/AnalyticsCharts";
import { TransactionList } from "@/components/finance/TransactionList";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useTransactions } from "@/hooks/useTransactions";
import { useDate } from "@/context/DateContext";
import { Transaction } from "@/types";
import { getCategoryById } from "@/config/categories";
import { getMonthSummary, getSpendByCategory } from "@/lib/api";

export function StatisticsPage() {
    const navigate = useNavigate();
    const { transactions, loadTransactions, deleteTransaction, isLoading } = useTransactions();
    const { selectedDate } = useDate();
    const [summary, setSummary] = useState({ income: 0, expense: 0 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [spendByCategory, setSpendByCategory] = useState<any[]>([]);

    useEffect(() => {
        loadTransactions(selectedDate);

        // Fetch API Reports
        const start = startOfMonth(selectedDate).toISOString();
        const end = endOfMonth(selectedDate).toISOString();

        getMonthSummary(start, end).then(setSummary).catch(console.error);
        getSpendByCategory(start, end).then(setSpendByCategory).catch(console.error);

    }, [selectedDate, loadTransactions]);

    // State for category modal
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // State for delete confirmation
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleEdit = (transaction: Transaction) => {
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

    const handleBubbleClick = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setIsCategoryModalOpen(true);
    };

    // Filter transactions for the selected category (client side filter of loaded transactions)
    const categoryTransactions = selectedCategoryId
        ? transactions.filter(t => t.categoryId === selectedCategoryId)
        : [];

    const selectedCategory = selectedCategoryId ? getCategoryById(selectedCategoryId as any) : null;

    return (
        <PageShell>
            <header className="flex flex-col items-center pt-4 pb-6 gap-4">
                <h1 className="text-xl font-semibold text-gray-900">Statistics</h1>
                <MonthSelector />
                {/* API Summary Cards */}
                <div className="flex gap-4 w-full px-4">
                    <div className="flex-1 bg-green-50 p-4 rounded-xl text-center">
                        <p className="text-sm text-green-600 font-medium">Income</p>
                        <p className="text-xl font-bold text-green-700">${summary.income.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-red-50 p-4 rounded-xl text-center">
                        <p className="text-sm text-red-600 font-medium">Expenses</p>
                        <p className="text-xl font-bold text-red-700">${summary.expense.toLocaleString()}</p>
                    </div>
                </div>
            </header>

            <main className="flex flex-col items-center gap-8 pb-20">

                {isLoading && <div className="text-gray-500">Loading...</div>}

                {/* Separated Bubbles */}
                {!isLoading && (
                    <BubblesCluster
                        transactions={transactions}
                        mode="separated"
                        height={500}
                        onBubbleClick={handleBubbleClick}
                    />
                )}

                {/* Charts */}
                <AnalyticsCharts transactions={transactions} />

                {/* API Spend By Category */}
                <div className="w-full px-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Category Breakdown (API)</h3>
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 space-y-2">
                        {spendByCategory.map((cat: any) => (
                            <div key={cat.categoryId} className="flex justify-between items-center">
                                <span style={{ color: cat.color }} className="font-medium">{cat.label}</span>
                                <span>${cat.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* List */}
                <TransactionList
                    transactions={transactions}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                />
            </main>

            {/* Category Transactions Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title={selectedCategory ? `${selectedCategory.label} Transactions` : 'Transactions'}
            >
                <div>
                    <TransactionList
                        transactions={categoryTransactions}
                        onEdit={(t) => {
                            setIsCategoryModalOpen(false);
                            handleEdit(t);
                        }}
                        onDelete={handleDeleteRequest}
                    />
                </div>
            </Modal>

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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export function StatisticsPage() {
    const navigate = useNavigate();
    const { getTransactionsByMonth, deleteTransaction } = useTransactions();
    const { selectedDate } = useDate();

    // Filter transactions for the selected month
    const transactions = getTransactionsByMonth(selectedDate);

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

    // Filter transactions for the selected category
    const categoryTransactions = selectedCategoryId
        ? transactions.filter(t => t.categoryId === selectedCategoryId)
        : [];

    const selectedCategory = selectedCategoryId ? getCategoryById(selectedCategoryId as any) : null;

    return (
        <PageShell>
            <header className="flex flex-col items-center pt-4 pb-6 gap-4">
                <h1 className="text-xl font-semibold text-gray-900">Statistics</h1>
                <MonthSelector />
            </header>

            <main className="flex flex-col items-center gap-8 pb-20">
                {/* Separated Bubbles */}
                <BubblesCluster
                    transactions={transactions}
                    mode="separated"
                    height={500}
                    onBubbleClick={handleBubbleClick}
                />

                {/* Charts */}
                <AnalyticsCharts transactions={transactions} />

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

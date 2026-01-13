import { TransactionList } from "@/components/finance/TransactionList";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useTransactionStore } from "@/stores/transactionStore";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function HistoryPage() {
  const navigate = useNavigate();
  const { historyTransactions, loadHistory, deleteTransaction } =
    useTransactionStore();

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    // Initial load
    loadHistory(0, pageSize).then(({ hasMore }) => {
      setHasMore(hasMore);
    });
  }, []);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { hasMore: more } = await loadHistory(nextPage, pageSize);
    setHasMore(more);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleEdit = (transaction: { id: string }) => {
    navigate(`/edit/${transaction.id}`);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteTransaction(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      // Reload filtering
      loadHistory(0, (page + 1) * pageSize);
    }
  };

  return (
    <PageShell>
      <header className="flex items-center gap-4 py-4 mb-4">
        <Link
          to="/statistics"
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          All Transactions
        </h1>
      </header>

      <main className="pb-20">
        <TransactionList
          transactions={historyTransactions}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          disableLimit
        />

        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-4 text-center text-blue-600 font-medium disabled:opacity-50 mt-4"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}

        {!hasMore && historyTransactions.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No more transactions
          </div>
        )}
      </main>

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

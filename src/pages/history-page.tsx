import { TransactionList } from "@/components/finance/TransactionList";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDeleteTransaction } from "@/hooks/use-transactions-query";
import { useTranslation } from "@/hooks/useTranslation";
import { useTransactionStore } from "@/stores/transactionStore";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function HistoryPage() {
  const navigate = useNavigate();
  const { historyTransactions, loadHistory } = useTransactionStore();
  const deleteTransactionMutation = useDeleteTransaction();
  const { t } = useTranslation();
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
    navigate({ to: "/edit/$id", params: { id: transaction.id } });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteTransactionMutation.mutateAsync(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      // Reload filtering
      loadHistory(0, (page + 1) * pageSize);
    }
  };

  return (
    <PageShell>
      <Header>
        <div className="flex items-center justify-center w-full relative px-6 gap-4 relative">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("nav.history")}
          </h1>
        </div>
      </Header>

      <main className="px-3 pb-32">
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
          <p className="text-gray-600 dark:text-gray-400">
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
            <Button
              variant="danger"
              fullWidth
              onClick={confirmDelete}
              disabled={deleteTransactionMutation.isPending}
            >
              {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

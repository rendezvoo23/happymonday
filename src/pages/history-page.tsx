import { TransactionList } from "@/components/finance/TransactionList";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { ConfirmAction } from "@/components/modals/confirm-action";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/Button";
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

        <div className="flex items-center justify-center w-full mt-4">
          {hasMore && (
            <Button
              variant="ghost"
              size="md"
              style={{ color: "var(--accent-color)" }}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner size="md" /> : t("transactions.loadMore")}
            </Button>
          )}
        </div>

        {!hasMore && historyTransactions.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            {t("transactions.noTransactions")}
          </div>
        )}
      </main>

      <ConfirmAction
        title={t("statistics.deleteTransaction")}
        description={t("statistics.deleteConfirmation")}
        onAction={confirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        isDestructive
        open={isDeleteModalOpen}
      />
    </PageShell>
  );
}
